#!/usr/bin/env node
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { CfnOutput, Duration, RemovalPolicy, SecretValue, Stack } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';

import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path"

import { Cors, LambdaIntegration, LogGroupLogDestination, RestApi } from "aws-cdk-lib/aws-apigateway";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";

export interface StaticSiteProps {
  domainName: string;
  owner: string;
  repo: string;
  sesRegion?: string;
  sesEmailAddress?: string;
}

/**
 * Static site infrastructure, which deploys site content to an S3 bucket.
 *
 * The site redirects from HTTP to HTTPS, using a CloudFront distribution,
 * Route53 alias record, and ACM certificate.
 */
export class StaticSite extends Construct {
  constructor(parent: Stack, name: string, props: StaticSiteProps) {
    super(parent, name);

    const zone = route53.HostedZone.fromLookup(this, 'Zone', { domainName: props.domainName });
    const siteDomain = props.domainName;
    const siteWithWWW = `www.${siteDomain}`;
    const cloudfrontOai = new cloudfront.OriginAccessIdentity(this, 'CloudfrontOAI', {
      comment: `OAI for ${name}: ${siteDomain}`
    });
    new CfnOutput(this, 'Site', { value: 'https://' + siteDomain });

    // Content bucket
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: siteDomain,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

      /**
       * The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
       * the new bucket, and it will remain in your account until manually deleted. By setting the policy to
       * DESTROY, cdk destroy will attempt to delete the bucket, but will error if the bucket is not empty.
       */
      removalPolicy: RemovalPolicy.DESTROY,

      /**
       * For sample purposes only, if you create an S3 bucket then populate it, stack destruction fails.  This
       * setting will enable full cleanup of the demo.
       */
      autoDeleteObjects: true,
    });

    // WWW redirect bucket
    const wwwRedirectBucket = new s3.Bucket(this, 'WWWRedirectSiteBucket', {
      bucketName: siteWithWWW,
      publicReadAccess: false,
      // blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

      /**
       * The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
       * the new bucket, and it will remain in your account until manually deleted. By setting the policy to
       * DESTROY, cdk destroy will attempt to delete the bucket, but will error if the bucket is not empty.
       */
      removalPolicy: RemovalPolicy.DESTROY,

      // /**
      //  * For sample purposes only, if you create an S3 bucket then populate it, stack destruction fails.  This
      //  * setting will enable full cleanup of the demo.
      //  */
      // autoDeleteObjects: true,
      websiteRedirect: { hostName: siteDomain },
    });

    // Grant access to cloudfront
    siteBucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [siteBucket.arnForObjects('*')],
      principals: [new iam.CanonicalUserPrincipal(cloudfrontOai.cloudFrontOriginAccessIdentityS3CanonicalUserId)]
    }));
    new CfnOutput(this, 'Bucket', { value: siteBucket.bucketName });

    // Grant access to cloudfront
    siteBucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [siteBucket.arnForObjects('*')],
      principals: [new iam.CanonicalUserPrincipal(cloudfrontOai.cloudFrontOriginAccessIdentityS3CanonicalUserId)]
    }));
    new CfnOutput(this, 'WWWRedirectBucket', { value: wwwRedirectBucket.bucketName });

    // TLS certificate stack (note that a new stack must be created if not in us-east-1)
    const certificateStack = Stack.of(this).region == 'us-east-1' ?
      Stack.of(this)
      : new Stack(this, 'SiteCertificateStack', {
        env: {
          region: 'us-east-1',
          account: Stack.of(this).account,
        },
        crossRegionReferences: true,
      });
    new CfnOutput(this, 'Stack', { value: certificateStack.stackName })

    // TLS certificate
    const wildcardSiteDomain = `*.${siteDomain}`;
    const certificate = new acm.Certificate(certificateStack, 'Certificate', {
      domainName: siteDomain,
      subjectAlternativeNames: [wildcardSiteDomain],
      validation: acm.CertificateValidation.fromDns(zone),
    });
    new CfnOutput(this, 'SiteCertificate', { value: certificate.certificateArn });
    
    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      certificate: certificate,
      defaultRootObject: "index.html",
      domainNames: [siteDomain],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      errorResponses:[
        {
          httpStatus: 403,
          responseHttpStatus: 403,
          responsePagePath: '/error.html',
          ttl: Duration.minutes(30),
        }
      ],
      defaultBehavior: {
        origin: new cloudfront_origins.S3Origin(siteBucket, { originAccessIdentity: cloudfrontOai }),
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      }
    });
    new CfnOutput(this, 'DistributionId', { value: distribution.distributionId });

    // CloudFront distribution for www redirect bucket
    const wwwRedirectDistribution = new cloudfront.Distribution(this, 'WWWRedirectDistribution', {
      certificate: certificate,
      // defaultRootObject: "index.html",
      domainNames: [siteWithWWW],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      errorResponses:[
        {
          httpStatus: 403,
          responseHttpStatus: 403,
          responsePagePath: '/error.html',
          ttl: Duration.minutes(30),
        }
      ],
      defaultBehavior: {
        origin: new cloudfront_origins.S3Origin(wwwRedirectBucket, { originAccessIdentity: cloudfrontOai }),
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      }
    });
    new CfnOutput(this, 'WWWRedirectDistributionId', { value: wwwRedirectDistribution.distributionId });

    // Route 53 alias record for the CloudFront distribution
    new route53.ARecord(this, 'SiteAliasRecord', {
      recordName: siteDomain,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      zone
    });

    // Route 53 alias record for the CloudFront www redirect distribution
    new route53.ARecord(this, 'WWWRedirectAliasRecord', {
      recordName: siteWithWWW,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(wwwRedirectDistribution)),
      zone
    });

    // AWS Lambda Contact Form Email Function
    const sesResource = `arn:aws:ses:${props.sesRegion}:${Stack.of(this).account}:identity/${siteDomain}`;
    const sesEmailAddress = String(props.sesEmailAddress);
    const contactFormEmailFunction = new NodejsFunction(this, "ContactFormEmailFunction", {
      architecture: Architecture.ARM_64,
      runtime: Runtime.NODEJS_18_X,
      entry: path.join(__dirname, "../lambdaFunctions/emailFunction.ts"),
      environment: {
        'SES_EMAIL_ADDRESS': sesEmailAddress
      },
      bundling: {
        externalModules: [
          '@aws-sdk/*', // Use the AWS SDK for JS v3 available in the Lambda runtime
          'cool-module', // 'cool-module' is already available in a Layer
        ],
      },
      logRetention: RetentionDays.ONE_DAY
    });
    contactFormEmailFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ses:SendEmail',
          'ses:SendRawEmail',
          'ses:SendTemplatedEmail',
        ],
        resources: [
          sesResource
        ],
      })
    )
    new CfnOutput(this, 'EmailFunction', { value: contactFormEmailFunction.functionName });

    // API Gateway certificate
    const apiDomainName = `api.${siteDomain}`;
    const apiGatewayCertificate = new acm.Certificate(this, 'ApiGatewayCertificate', {
      domainName: apiDomainName,
      validation: acm.CertificateValidation.fromDns(zone),
    });
    new CfnOutput(this, 'ApiCertificate', { value: apiGatewayCertificate.certificateArn });

    const restApiName = `${this.toString()}-staticPageApi`;
    const logGroupName = `${this.toString()}_static_page_api`
    const api = new RestApi(this, "ApiGateway", {
      cloudWatchRole: true,
      domainName: {
        domainName: apiDomainName,
        certificate: apiGatewayCertificate
      },
      restApiName,
      defaultCorsPreflightOptions: {
        allowHeaders: Cors.DEFAULT_HEADERS,
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS
      },
      deployOptions: {
        accessLogDestination: new LogGroupLogDestination(new LogGroup(this, "ApiLogGroup", {
            logGroupName,
            retention: RetentionDays.ONE_DAY,
            removalPolicy: RemovalPolicy.DESTROY
        }))
      }
    });

    // Add record for API
    new route53.ARecord(this, 'CustomDomainAliasRecord', {
      recordName: apiDomainName,
      zone,
      target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api))
    });
    new CfnOutput(this, "Api", { value: api.restApiName });
    new CfnOutput(this, "ApiAliasUrl", { value: `https://${apiDomainName}` });

    // Add Lambda function to API
    const contactFormResourceName = "contact";
    api.root
      .addResource(contactFormResourceName)
      .addMethod('POST', new LambdaIntegration(contactFormEmailFunction));

    // AWS CodePipeline pipeline
    const pipeline = new codepipeline.Pipeline(this, "SitePipeline", {
      pipelineName: props.domainName,
    });

    // Build
    const project = new codebuild.Project(this, 'FrontEndBuild', {
      source: codebuild.Source.gitHub({
        owner: props.owner, 
        repo: props.repo
      }),
      buildSpec: codebuild.BuildSpec.fromSourceFilename('./buildspec.yaml'),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true
      },
      environmentVariables: {
        tag: {
          value: 'cdk'
        }
      }
    });

    // Source
    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipelineActions.GitHubSourceAction({
      actionName: 'GithubSource',
      output: sourceOutput,
      owner: props.owner,
      repo: props.repo,
      oauthToken: SecretValue.secretsManager('github-oauth-token'),
    });
    pipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction]
    });

    const buildOutput = new codepipeline.Artifact();
    const buildAction = new codepipelineActions.CodeBuildAction({
      actionName: 'CodeBuild',
      project,
      input: sourceOutput,
      outputs: [buildOutput]
    });
    pipeline.addStage({
      stageName: 'Build',
      actions: [buildAction],
    });

    // Deploy
    const deployAction = new codepipelineActions.S3DeployAction({
      actionName: 'S3Deploy',
      bucket: siteBucket,
      input: buildOutput
    });
    pipeline.addStage({
      stageName: 'Deploy',
      actions: [deployAction]
    });
    new CfnOutput(this, 'Pipeline', { value: pipeline.pipelineName });
  }
}