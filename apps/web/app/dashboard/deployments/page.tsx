"use client";

import { useMemo, useState, type FormEvent } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Plus, Layers3, Palette } from "lucide-react";
import { useMutation, useQuery } from "convex/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { DEFAULT_BRANDING } from "@/convex/branding";

type DeploymentType = "bubble-pop" | "golf" | "basketball" | "archery";

const deploymentTypes: Array<{ value: DeploymentType; label: string }> = [
  { value: "bubble-pop", label: "Bubble Pop" },
  { value: "golf", label: "Golf" },
  { value: "basketball", label: "Basketball" },
  { value: "archery", label: "Archery" },
];

const typefaces: Array<{ value: string; label: string }> = [
  { value: "Nunito Sans", label: "Nunito Sans" },
  { value: "Space Grotesk", label: "Space Grotesk" },
  { value: "Sora", label: "Sora" },
  { value: "DM Sans", label: "DM Sans" },
  { value: "IBM Plex Sans", label: "IBM Plex Sans" },
];

const initialFormState = {
  name: "",
  type: deploymentTypes[0].value,
  isActive: true,
  primaryColor: DEFAULT_BRANDING.primaryColor,
  secondaryColor: DEFAULT_BRANDING.secondaryColor,
  tertiaryColor: DEFAULT_BRANDING.tertiaryColor,
  typography: DEFAULT_BRANDING.typography,
};

type ColorFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function ColorField({ id, label, value, onChange }: ColorFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={`${id}-picker`}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-10 cursor-pointer rounded-md border-0 bg-transparent p-0.5 shadow-none appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label={`${label} color picker`}
        />
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 text-xs font-medium uppercase"
        />
      </div>
    </div>
  );
}

const getTypeLabel = (type: DeploymentType) =>
  deploymentTypes.find((option) => option.value === type)?.label ?? type;

export default function DeploymentsPage() {
  const deploymentRecords = useQuery(api.deployments.list);
  const createDeployment = useMutation(api.deployments.create);
  const setDeploymentActive = useMutation(api.deployments.setActive);
  const isLoading = deploymentRecords === undefined;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState(initialFormState);

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
          secondary: deployment.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
          tertiary: deployment.tertiaryColor ?? DEFAULT_BRANDING.tertiaryColor,
        },
      })),
    [deploymentRecords]
  );

  const activeCount = deployments.filter((deployment) => deployment.isActive)
    .length;
  const inactiveCount = deployments.length - activeCount;

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setFormState(initialFormState);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createDeployment({
        name: formState.name.trim(),
        type: formState.type,
        isActive: formState.isActive,
        branding: {
          primaryColor: formState.primaryColor,
          secondaryColor: formState.secondaryColor,
          tertiaryColor: formState.tertiaryColor,
          typography: formState.typography,
        },
      });
      handleDialogChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
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
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="size-4" />
            New deployment
          </DialogTrigger>
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
              <DialogTrigger render={<Button size="sm" />}>
                Create deployment
              </DialogTrigger>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{activeCount} active</Badge>
              <Badge variant="outline">{inactiveCount} inactive</Badge>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Deployments</CardTitle>
                <CardDescription>
                  Toggle active status and review the branding profile for each
                  deployment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <div className="hidden grid-cols-[1.6fr_0.9fr_1fr_0.8fr_auto] items-center gap-3 border-b bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
                    <span>Name</span>
                    <span>Type</span>
                    <span>Branding</span>
                    <span>Updated</span>
                    <span className="sr-only">Active</span>
                  </div>
                  {deployments.map((deployment) => (
                    <div
                      key={deployment.id}
                      className="grid gap-3 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[1.6fr_0.9fr_1fr_0.8fr_auto] sm:items-center"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1 size-2 rounded-full ${
                            deployment.isActive
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
                        <div className="flex items-center gap-1">
                          {[
                            deployment.colors.primary,
                            deployment.colors.secondary,
                            deployment.colors.tertiary,
                          ].map((color, index) => (
                            <span
                              key={`${deployment.id}-color-${index}`}
                              className="size-4 rounded-full border"
                              style={{ backgroundColor: color }}
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {deployment.colors.primary}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNowStrict(
                          new Date(deployment.updatedAt),
                          { addSuffix: true }
                        )}
                      </div>
                      <div className="flex items-center justify-start gap-2 sm:justify-end">
                        <Switch
                          checked={deployment.isActive}
                          onCheckedChange={(value) =>
                            void setDeploymentActive({
                              id: deployment.id,
                              isActive: value,
                            })
                          }
                          aria-label={`Toggle ${deployment.name} active`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create deployment</DialogTitle>
          <DialogDescription>
            Configure the deployment type, colors, and typography for this
            deployment.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-[1.3fr_1fr]">
            <div className="grid gap-2">
              <Label htmlFor="deployment-name">Deployment name</Label>
              <Input
                id="deployment-name"
                placeholder="e.g. Summer launch"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deployment-type">Type</Label>
              <Select
                items={deploymentTypes}
                value={formState.type}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    type: value as DeploymentType,
                  }))
                }
              >
                <SelectTrigger id="deployment-type" className="w-full">
                  <SelectValue placeholder="Select a type">
                    {getTypeLabel(formState.type)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {deploymentTypes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1.3fr_1fr]">
            <div className="grid gap-2">
              <Label htmlFor="deployment-typography">Typeface</Label>
              <Select
                items={typefaces}
                value={formState.typography}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    typography: value ?? prev.typography,
                  }))
                }
              >
                <SelectTrigger id="deployment-typography" className="w-full">
                  <SelectValue placeholder="Select a typeface">
                    {formState.typography}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {typefaces.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deployment-active">Active</Label>
              <div className="flex items-center justify-between gap-3 rounded-md border border-input px-3 py-2">
                <span className="text-sm">
                  Active Deployment
                </span>
                <Switch
                  id="deployment-active"
                  checked={formState.isActive}
                  onCheckedChange={(value) =>
                    setFormState((prev) => ({ ...prev, isActive: value }))
                  }
                  aria-label="Set deployment active"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-dashed p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="size-4" />
              Branding colors
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Choose the palette that will style widgets and verification surfaces.
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <ColorField
                id="primary-color"
                label="Primary"
                value={formState.primaryColor}
                onChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    primaryColor: value,
                  }))
                }
              />
              <ColorField
                id="secondary-color"
                label="Secondary"
                value={formState.secondaryColor}
                onChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    secondaryColor: value,
                  }))
                }
              />
              <ColorField
                id="tertiary-color"
                label="Tertiary"
                value={formState.tertiaryColor}
                onChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    tertiaryColor: value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              type="submit"
              disabled={isSubmitting || !formState.name.trim()}
            >
              Create deployment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
