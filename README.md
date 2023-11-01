# Welcome to the Static NextJS CDK Stack Builder

Want to skip Vercel and thus cut out the middleman by deploying directly on AWS? This is an attempt to create a CDK template that can be used to deploy a static Next.js app. Assuming you have a valid `buildspec.yaml` (with that spelling) in your project, you should be able to use this to deploy a your static Next.js app!

## What do I need in order to use this?

* A Next.js project Github repository (other repositories are not supported at the moment) with static hosting (dynamic hosting requires a server).
* As mentioned before, a valid `buildspec.yaml` with the `yaml` suffix within that repository
* An AWS account

## What this CDK stack will create

* An S3 bucket for hosting the static website (at the parent origin)
* An S3 bucket for redirecting `www` traffic to the hosting website
* CloudFront distributions for both buckets
* A certificate from Amazon Certificate Manager that can handle parent and wildcard domains (e.g., if the domain is `example.com`, it can support `example.com` and of its subdomains)
* An AWS Lambda function that will use SES to send an email, provided you give a valid name, email, and message (SES email address will have to be validated by domain; see below)
* An API Gateway endpoint that will allow the site to trigger said Lambda function
* A certificate for said API Gateway endpoint that has a simplified domain (for example, if your domain is `example.com`, then the API you would be calling in the NextJS static site would be `api.example.com`)
* Route 53 records for the parent domain, for `www` traffic, and for the API (Route 53 hosting zone will have to be manually configured first)
* A CodePipeline that will build and deploy your static NextJS website provided it is hosted on Github and it has a valid `buildspec.yaml`

In the future, I would like to allow for a user to have the option to pick and choose between whether or not to use `www` as their website's primary domain or vice-versa (which is what this implementation uses). I personally like using parent domains and just routing `www` traffic there (since there's always that one user who is going to type "www" before a website's domain), but I want to allow for both. However, right now this is designed with my setup in mind, rather than with scaleability in mind.

Similarly, in the future I'd like to allow for a user to be able to set up different subdomains for testing and the like, or to have the option to not add the contact form Lambda architecture, or even add other Lambda functions with their own API gateway calls; perhaps even a command line tool to make this seamless and relatively simple. But this is all I can commit to right now.

## Before this will work in AWS...

- You need to download and configure the AWS CLI and set up SSO Login (installation instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)) and set up SSO Login (I assume that most people who are using this will know the basics of AWS).
    - And of course you are going to want to run `cdk bootstrap` for both `us-east-1` and whatever other region you're using.
- You need to manually create your hosted zone in Route 53. I know that technically CloudFormation _could_ create a hosted zone, but since this CloudFormation stack uses domain-based validation, it's a much better idea to set up your hosted zone and set up all your DNS stuff beforehand (note: if you're using DNS forwarding, set that up **before** creating your CloudFormation stack). With that in mind, please note that the stack WILL create an alias record within your hosted zone, so you don't need to worry about that.
- In a similar vein, if you want to be able to send emails using SES, AWS Lambda, and API Gateway, you will need to manually verify your email address in SES before creating the Cloudformation stack. At this time, this implementation only supports domain-based identities (yet another reason to set up DNS forwarding before creating the CloudFormation stack).
- Last, but not least, you're going to create a `.env` file. It is already in your `.gitignore` file, so **don't commit it**. You can follow `.env.bk` to see which values you need, but these are the highlights:
    - **CDK_DEFAULT_ACCOUNT:** Your AWS account
    - **CDK_DEFAULT_REGION:** The region this account will be in
    - **DOMAIN:** The domain of your website, which should match your hosted zone in Route 53
    - **GITHUB_OWNER:** Your Github user
    - **GITHUB_REPO:** The name of your Github repository. Please bear in mind that your CodePipeline, when created, will deploy based on your `master` branch, so make sure that branch exists (and I recommend protecting it as well).
    - **SES_EMAIL_ADDRESS:** An email address from your SES list

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

- [x] SNS mailing
- [ ] Splitting a lot of this outside of the context within `static-site.ts`
- [ ] Ability to use CodeCommit, Bitbucket, and other repository systems
- [ ] Interactivity via use of a command line or something in that nature