import { SimpleHeader } from "@/components/group-nav";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-desk text-ink">
      <SimpleHeader />
      <main className="mx-auto max-w-[34rem] space-y-4 px-4 pt-12 pb-20">
        <h1 className="font-serif text-3xl text-ink">
          Page not found.
        </h1>
        <p className="text-base text-pencil">
          That page either does not exist or belongs to a group you are not a member of.
        </p>
        <div className="pt-2">
          <ButtonLink href="/home" variant="primary">
            Back to your group
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
