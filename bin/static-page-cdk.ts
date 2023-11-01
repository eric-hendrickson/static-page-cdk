#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StaticPageCdkStack } from '../lib';
require('dotenv').config();

const app = new cdk.App();

const formatDomainForStackName = (domainName: string | undefined) => {
  if (!domainName) {
    return '';
  }
  const periodIndex = domainName.lastIndexOf('.');
  return domainName.charAt(0).toUpperCase() + domainName.slice(1, periodIndex) +
    domainName.charAt(periodIndex + 1).toUpperCase() + domainName.slice(periodIndex + 2);
}

new StaticPageCdkStack(app, `${formatDomainForStackName(process.env.DOMAIN)}-StaticPageCdkStack`, {
  /* Make sure you put the appropriate variables in a .env file (using .env.bk as a guide), 
   * or this stack will not work. */
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  crossRegionReferences: true

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});