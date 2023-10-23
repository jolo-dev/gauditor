import { SSTConfig } from "sst";
import { NpmAuditStack } from "./stacks/NpmAuditStack";
import { DefaultStackSynthesizer } from "aws-cdk-lib/core";

export default {
  config(input) {
    const short = input.stage === "cfo-ec1" ? "d" : "b-dev"; // b for sandbox
    const account = input.stage === "cfo-ec1" ? "675134546017" : "354436255087";
    return {
      name: "de-ves-do-npm-audit",
      region: "eu-central-1",
      bootstrap: {
        stackName: `cfo-ec1-de-ves-do-sst-toolkit-${short}-stack`,
      },
      ssmPrefix: "/par-ec1-de-ves-do-",
      cdk: {
        toolkitStackName: `cfo-ec1-de-ves-do-cdk-toolkit-${short}-stack`,
        fileAssetsBucketName: `s3-ec1-de-ves-do-cdk-toolkit-${short}-assets-hnb659fds`,
        fileAssetPublishingRoleArn: `arn:aws:iam::${account}:role/iam-de-ves-do-cdk-toolkit-${short}-file-publishing-role-hnb659fds`,
        deployRoleArn: `arn:aws:iam::${account}:role/iam-de-ves-do-cdk-toolkit-${short}-deploy-role-hnb659fds`,
        imageAssetPublishingRoleArn: `arn:aws:iam::${account}:role/iam-de-ves-do-cdk-toolkit-${short}-image-publishing-role-hnb659fds`,
        lookupRoleArn: `arn:aws:iam::${account}:role/iam-de-ves-do-cdk-toolkit-${short}-lookup-role-hnb659fds`,
        cloudFormationExecutionRole: `arn:aws:iam::${account}:role/iam-de-ves-do-cdk-toolkit-${short}-cfn-exec-role-hnb659fds`,
        imageAssetsRepositoryName: `ecr-ec1-de-ves-do-cdk-toolkit-${short}-assets-hnb659fds`,
        bootstrapStackVersionSsmParameter: `/par-ec1-de-ves-do-cdk-toolkit-${short}-bootstrap/hnb659fds/version`,
      },
    };
  },
  stacks(app) {
    const short = app.stage === "cfo-ec1" ? "d" : "b";
    new NpmAuditStack(app, "NpmAuditStack", {
      stage: app.stage,
      stackName: `cfo-ec1-de-ves-do-npm-audit-${short}-dev-stack`,
      synthesizer: new DefaultStackSynthesizer({
        fileAssetsBucketName: `s3-ec1-de-ves-do-cdk-toolkit-${short}-assets-hnb659fds`,
        fileAssetPublishingRoleArn: `arn:aws:iam::${app.account}:role/iam-de-ves-do-cdk-toolkit-${short}-file-publishing-role-hnb659fds`,
        deployRoleArn: `arn:aws:iam::${app.account}:role/iam-de-ves-do-cdk-toolkit-${short}-deploy-role-hnb659fds`,
        imageAssetPublishingRoleArn: `arn:aws:iam::${app.account}:role/iam-de-ves-do-cdk-toolkit-${short}-image-publishing-role-hnb659fds`,
        lookupRoleArn: `arn:aws:iam::${app.account}:role/iam-de-ves-do-cdk-toolkit-${short}-lookup-role-hnb659fds`,
        cloudFormationExecutionRole: `arn:aws:iam::${app.account}:role/iam-de-ves-do-cdk-toolkit-${short}-cfn-exec-role-hnb659fds`,
        imageAssetsRepositoryName: `ecr-ec1-de-ves-do-cdk-toolkit-${short}-assets-hnb659fds`,
        bootstrapStackVersionSsmParameter: `/par-ec1-de-ves-do-cdk-toolkit-${short}-bootstrap/hnb659fds/version`,
      }),
    });
  },
} satisfies SSTConfig;
