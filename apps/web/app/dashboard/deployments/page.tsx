"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { Plus, Layers3, MoreHorizontal, Pencil, Trash2, Copy, Check } from "lucide-react";
import { useMutation, useQuery } from "convex/react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DEFAULT_BRANDING } from "@/convex/branding";

type DeploymentType = "bubble-pop" | "osu" | "snake";

const deploymentTypes: Array<{ value: DeploymentType; label: string }> = [
  { value: "bubble-pop", label: "Bubble Pop" },
  { value: "osu", label: "OSU" },
  { value: "snake", label: "Snake" },
];

const getTypeLabel = (type: DeploymentType) =>
  deploymentTypes.find((option) => option.value === type)?.label ?? type;

type Deployment = {
  id: Id<"deployments">;
  name: string;
  type: DeploymentType;
  isActive: boolean;
  updatedAt: number;
  typography: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
  };
};

export default function DeploymentsPage() {
  const deploymentRecords = useQuery(api.deployments.list);
  const removeDeployment = useMutation(api.deployments.remove);
  const isLoading = deploymentRecords === undefined;

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDeployment, setSelectedDeployment] =
    useState<Deployment | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deployments = useMemo(
    () =>
      (deploymentRecords ?? []).map((deployment) => ({
        id: deployment._id,
        name: deployment.name,
        type: deployment.type as DeploymentType,
        isActive: deployment.isActive,
        updatedAt: deployment.updatedAt,
        typography: deployment.typography ?? DEFAULT_BRANDING.typography,
        colors: {
          primary: deployment.primaryColor ?? DEFAULT_BRANDING.primaryColor,
          secondary:
            deployment.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
          background:
            deployment.backgroundColor ?? DEFAULT_BRANDING.backgroundColor,
          surface: deployment.surfaceColor ?? DEFAULT_BRANDING.surfaceColor,
        },
      })),
    [deploymentRecords]
  );

  const activeCount = deployments.filter(
    (deployment) => deployment.isActive
  ).length;
  const inactiveCount = deployments.length - activeCount;

  const handleDeleteDialogChange = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setSelectedDeployment(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDeployment) {
      return;
    }

    setIsSubmitting(true);
    try {
      await removeDeployment({ id: selectedDeployment.id });
      handleDeleteDialogChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (deployment: Deployment) => {
    setSelectedDeployment(deployment);
    setIsDeleteDialogOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Deployments
            </h1>
            <p className="text-sm text-muted-foreground">
              Each deployment ships with its own branding and verification
              experience.
            </p>
          </div>
          <Button size="sm" nativeButton={false} render={<Link href="/dashboard/deployments/create" />}>
            <Plus className="size-4" />
            New deployment
          </Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">
            Loading deployments...
          </div>
        ) : deployments.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Layers3 className="size-5" />
              </EmptyMedia>
              <EmptyTitle>No deployments yet</EmptyTitle>
              <EmptyDescription>
                Create your first deployment to start running branded
                verification deployments.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" nativeButton={false} render={<Link href="/dashboard/deployments/create" />}>
                Create deployment
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{activeCount} active</Badge>
              <Badge variant="outline">{inactiveCount} inactive</Badge>
            </div>

            <div className="rounded-lg border">
              <div className="hidden grid-cols-[minmax(140px,0.8fr)_1.4fr_0.8fr_0.8fr_0.7fr_auto] items-center gap-3 border-b bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
                <span>ID</span>
                <span>Name</span>
                <span>Type</span>
                <span>Colors</span>
                <span>Updated</span>
                <span className="sr-only">Actions</span>
              </div>
              {deployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="grid gap-3 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(140px,0.8fr)_1.4fr_0.8fr_0.8fr_0.7fr_auto] sm:items-center"
                >
                  <div className="flex items-center gap-1.5">
                    <code className="text-xs font-mono text-muted-foreground truncate max-w-[100px]">
                      {deployment.id}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => handleCopyId(deployment.id)}
                    >
                      {copiedId === deployment.id ? (
                        <Check className="size-3 text-green-500" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                      <span className="sr-only">Copy ID</span>
                    </Button>
                  </div>
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 size-2 rounded-full ${deployment.isActive
                        ? "bg-primary"
                        : "bg-muted-foreground"
                        }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {deployment.name}
                        </span>
                        <Badge
                          variant={
                            deployment.isActive ? "secondary" : "outline"
                          }
                        >
                          {deployment.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {deployment.typography}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground sm:hidden">
                      Type
                    </span>
                    <Badge variant="outline">
                      {getTypeLabel(deployment.type)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex justify-center items-center gap-1">
                      {[
                        deployment.colors.primary,
                        deployment.colors.secondary,
                        deployment.colors.background,
                        deployment.colors.surface,
                      ].map((color, index) => (
                        <span
                          key={`${deployment.id}-color-${index}`}
                          className="size-4 rounded-full border"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNowStrict(new Date(deployment.updatedAt), {
                      addSuffix: true,
                    })}
                  </div>
                  <div className="flex items-center justify-start gap-2 sm:justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Open menu</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          render={<Link href={`/dashboard/deployments/${deployment.id}`} />}
                          nativeButton={false}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => openDeleteDialog(deployment)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={handleDeleteDialogChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete deployment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {selectedDeployment?.name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
