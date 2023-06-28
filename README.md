# Welcome to the Nextjs CDK Stack Builder

Want to skip Vercel and thus cut out the middleman by deploying directly on AWS? This is an attempt to create a CDK template that can be used to deploy a static Next.js app. Assuming you have a valid `buildspec.yaml` (with that spelling) in your project, you should be able to use this to deploy a your static Next.js app!

## What do I need in order to get this to work?

* A Next.js project Github repository (other repositories are not supported at the moment)
* As mentioned before, a valid `buildspec.yaml` with the `yaml` suffix within that repository
* An AWS account

## Before this will work in AWS...

- You need to download and configure the AWS CLI and set up SSO Login (installation instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)) and set up SSO Login (I assume that most people who are using this will know the basics of AWS).
- You need to create a hosted zone in Route 53. I know that technically CloudFormation _could_ create a hosted zone, but since this CloudFormation stack uses domain-based validation, it's a much better idea to set up your hosted zone and set up all your DNS stuff beforehand (note: if you're using DNS forwarding, set that up **before** creating your CloudFormation stack). With that in mind, please note that the stack WILL create an alias record within your hosted zone.
- You also need to create a an Oauth token and add it to your secrets in your AWS account. You can learn how to do that [here](https://docker.awsworkshop.io/41_codepipeline/10_setup_secretsmanager_github.html).
- Last, but not least, you're going to create a `.env` file. It is already in your `.gitignore` file, so **don't commit it**. You can follow `.env.bk` to see which values you need, but these are the highlights:
    - **CDK_DEFAULT_ACCOUNT:** Your AWS account
    - **CDK_DEFAULT_REGION:** The region this account will be in
    - **DOMAIN:** The domain of your website, which should match your hosted zone in Route 53
    - **SUBDOMAIN:** Generally this should be "www"
    - **GITHUB_OWNER:** Your Github user
    - **GITHUB_REPO:** The name of your Github repository. Please bear in mind that your CodePipeline, when created, will deploy based on your `master` branch, so make sure that branch exists

## How to run this CDK stack

After you've done all of the above, this stack should be ready to deploy. You can then run `npm run build` followed by `cdk deploy --all` (unless your default region is `us-east-1`, in which case you only need to run `cdk deploy`).

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests (note: no tests at the moment)
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## Other notes

For the most part, everything is in `lib/static-site.ts`. I think this is sloppy (I'd prefer to use different contexts), but for now this is good enough and seems to work well.

The static site creation in ./lib/static-site.ts is heavily based on https://github.com/aws-samples/aws-cdk-examples/blob/master/typescript/static-site/index.ts while the CodePipeline implementation is heavily based on https://github.com/jinspark-lab/aws-cdk-examples/blob/master/typescript/frontend-cicd/lib/frontend-cicd-stack.ts.

## Future features planned at the moment

- [ ] SNS mailing
- [ ] Splitting a lot of this outside of the context within `static-site.ts`
- [ ] Ability to use CodeCommit, Bitbucket, and other repository systems
- [ ] Interactivity via use of a command line or something in that nature