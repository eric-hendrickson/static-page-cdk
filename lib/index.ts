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
export class NextJsCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const domainName = process.env.DOMAIN ? process.env.DOMAIN : '';
    const siteSubDomain = process.env.SUBDOMAIN ? process.env.SUBDOMAIN : '';

    new StaticSite(this, 'StaticSite', {
      domainName,
      siteSubDomain
    })
  }
}