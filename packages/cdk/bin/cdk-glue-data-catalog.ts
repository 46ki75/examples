#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { GlueDataCatalogStack } from "../lib/glue-data-catalog";

const app = new cdk.App();

new GlueDataCatalogStack(app, "GlueDataCatalog");
