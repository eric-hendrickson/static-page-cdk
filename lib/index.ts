import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StaticSite } from './static-site';
require('dotenv').config();

/**
 * This stack relies on getting the domain name from CDK context.
 * Use 'cdk synth -c domain=mystaticsite.com -c subdomain=www'
 * Or add the following to cdk.json:
 * {
 *   "context": {
 *     "domain": "mystaticsite.com",
 *     "subdomain": "www",
 *     "accountId": "1234567890",
 *   }
 * }
**/
export class StaticPageCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const domainName = process.env.DOMAIN ? process.env.DOMAIN : '';
    const owner = process.env.GITHUB_OWNER ? process.env.GITHUB_OWNER : '';
    const repo = process.env.GITHUB_REPO ? process.env.GITHUB_REPO : '';
    const sesRegion = process.env.SES_REGION ? process.env.SES_REGION : process.env.CDK_DEFAULT_REGION;
    const sesEmailAddress = process.env.SES_EMAIL_ADDRESS ? process.env.SES_EMAIL_ADDRESS : '';

    new StaticSite(this, 'StaticSite', {
      domainName,
      owner,
      repo,
      sesRegion,
      sesEmailAddress
    })
  }
}
