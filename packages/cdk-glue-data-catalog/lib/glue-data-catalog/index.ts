import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import { CommonStack } from "./common";
import { CloudTrailStack } from "./cloudtrail";

export class GlueDataCatalogStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const common = new CommonStack(this, "Common");

    new CloudTrailStack(this, "CloudTrail", {
      database: common.database,
      workgroup: common.workgroup,
    });
  }
}
