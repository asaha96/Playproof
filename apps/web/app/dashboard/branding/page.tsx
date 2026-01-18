"use client";

import Link from "next/link";
import { ArrowRight, Palette } from "lucide-react";
import { useQuery } from "convex/react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

export default function BrandingPage() {
  const deployments = useQuery(api.deployments.list) ?? [];
  const activeCount = deployments.filter((deployment) => deployment.isActive)
    .length;
  const inactiveCount = deployments.length - activeCount;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Branding</h1>
          <p className="text-sm text-muted-foreground">
            Branding now lives on each deployment, not on the account.
          </p>
        </div>
        <Link
          href="/dashboard/deployments"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          Manage deployments
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-4" />
            Deployment branding overview
          </CardTitle>
          <CardDescription>
            Each deployment carries its own palette, typography, and type.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">{activeCount} active</Badge>
          <Badge variant="outline">{inactiveCount} inactive</Badge>
          <Badge variant="outline">{deployments.length} total</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
