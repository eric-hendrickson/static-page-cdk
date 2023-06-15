#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NextJsCdkStack } from '../lib';
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

new NextJsCdkStack(app, `${formatDomainForStackName(process.env.DOMAIN)}-NextJsCdkStack`, {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Make sure you put the appropriate variables in a .env file (using .env.bk as a guide), 
   * or this stack will not work. */
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  crossRegionReferences: true

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});