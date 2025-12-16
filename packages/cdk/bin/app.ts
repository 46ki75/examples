#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";

import { CustomResourceStack } from "../lib/custom-resource";
import { EC2NATStack } from "../lib/ec2-nat";
import { GlueDataCatalogStack } from "../lib/glue-data-catalog";
import { FargatePublicStack } from "../lib/fargate";

const app = new cdk.App();

new CustomResourceStack(app, "CustomResource");
new EC2NATStack(app, "EC2NATStack");
new FargatePublicStack(app, "FargatePublic");
new GlueDataCatalogStack(app, "GlueDataCatalog");
