# CodeCommit Auditor

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [CodeCommit Auditor](#codecommit-auditor)
  - [Table of Contents](#table-of-contents)
- [Introduction](#introduction)
  - [SST (Serverless Stack Framework)](#sst-serverless-stack-framework)
    - [Patches](#patches)
  - [Deployment](#deployment)
  - [Development](#development)
- [Create Documentation and Start Documentation Server](#create-documentation-and-start-documentation-server)
  - [TODO](#todo)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Introduction

This project creates a statemachine with Amazon Stepfunctions which deploys a bunch of Lambdas to create a Codepipeline and Codebuild Projects for running `npm audit` on each Codecommit repository.

![npm Audit Workflow](NPM-Audit-Workflows.png)

## SST (Serverless Stack Framework)

[SST](https://sst.dev/) is a framework on top of AWS CDK. It makes developing AWS Lambda quicker and provide a UI console only for the deployed stack.
The benefit is that you don't need to search your resources in the AWS Console as it will displayed in their console.
Furthermore, SST is quicker than CDK, there is a good comparison when using their [Dev Mode](https://docs.sst.dev/live-lambda-development#cdk-watch) and it provides Debug functions with VS Code.

### Patches

SST tries to create resources in order to fulfill their developer experience.
Unfortunately, they have hardcoded names and thus we need to patch.
That is why, there are two patches `bootstrap.js` and `Stack.js` which contains patches with our naming convention.

> NOTE: Please, ignore them.

These two files will be placed inside `node_modules/sst`. That is now part of the `script`- section inside the `package.json` and is called before each `sst`-command.

```sh
npm run move:patches
```

## Deployment

It will just deploy one stack and will reside only in the DEV account.

```sh
npm install
npm run build
npm run deploy
```

## Development

You can simply develop in your sandbox when using `awsume sandbox`.

Simply run `npm run dev`.

# Create Documentation and Start Documentation Server

The <i>full documentation</i> for this project can be found on the [documentation server](https://docs.dev.webservice-test.de/esb-oracledb-lambda-layer/index.html).

## TODO

[X] Check Namespaces
[] Deployment with Ghaieth

> NOTE: only available within the intranet!

For more details on documentation generation and access the documentation locally refer to [Documentation How-To](./additional-documentation/development/how-to-document.html).
