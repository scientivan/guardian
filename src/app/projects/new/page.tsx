import { NewProjectWizard } from "@/components/app/NewProjectWizard";

// `?step=3` opens the wizard straight at that step (1-based), e.g. the hospital picker.
export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step } = await searchParams;
  return <NewProjectWizard initialStep={Number(step ?? 1) - 1} />;
}
