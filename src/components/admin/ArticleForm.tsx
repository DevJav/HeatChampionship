"use client";

import { useActionState, useState } from "react";
import type { Article } from "@/generated/prisma/client";
import { CheckboxField, FormLayout, SelectField, TextareaField, TextField } from "@/components/forms/FormFields";
import { ARTICLE_CATEGORIES, ARTICLE_CATEGORY, ARTICLE_STATUS } from "@/lib/articles";
import type { ArticleEditorOptions } from "@/lib/data/articles";
import type { FormAction, FormState } from "@/lib/forms";
import { Field, Input } from "@/components/ui";
import { raceTitle } from "@/lib/races";
import { ArticleBodyEditor } from "./ArticleBodyEditor";
import { t } from "@/i18n";

const categoryOptions = ARTICLE_CATEGORIES.map((value) => ({ value, label: ARTICLE_CATEGORY[value].label }));
const statusOptions = (["DRAFT", "PUBLISHED"] as const).map((value) => ({ value, label: ARTICLE_STATUS[value].label }));

/** Banner image picker, previewing the chosen file before it's uploaded. */
function CoverField({ state, current }: { state: FormState; current: string | null | undefined }) {
  const [picked, setPicked] = useState<string | null>(null);
  const shown = picked ?? (current ? `/media/${current}` : null);
  const error = state.fieldErrors?.cover;

  function pick(file: File | undefined) {
    if (picked) URL.revokeObjectURL(picked);
    setPicked(file ? URL.createObjectURL(file) : null);
  }

  return (
    <Field
      label={t.admin.articles.cover}
      htmlFor="cover"
      hint={t.admin.articles.coverHint}
      error={error}
      className="md:col-span-2"
    >
      {shown && (
        // eslint-disable-next-line @next/next/no-img-element -- local preview or an already resized upload
        <img src={shown} alt="" className="aspect-[3/1] w-full object-cover clip-chamfer" />
      )}
      <Input
        id="cover"
        name="cover"
        type="file"
        accept="image/*"
        aria-invalid={error ? true : undefined}
        onChange={(e) => pick(e.target.files?.[0])}
        className="h-auto py-1.5 file:mr-3 file:border-0 file:bg-border file:px-3 file:py-1 file:text-sm file:font-semibold"
      />
      {current && !picked && <CheckboxField name="removeCover" label={t.admin.articles.removeCover} state={state} />}
    </Field>
  );
}

type ArticleFormProps = {
  action: FormAction;
  article?: Article;
  options: ArticleEditorOptions;
};

export function ArticleForm({ action, article, options }: ArticleFormProps) {
  const [state, formAction] = useActionState(action, {});
  const raceOptions = options.races.map((race) => ({ value: race.id, label: `${race.season.name} · ${raceTitle(race)}` }));

  return (
    <form action={formAction}>
      <FormLayout state={state} submitLabel={article ? t.forms.save : t.admin.articles.create} cancelHref="/admin/noticias">
        <TextField
          name="title"
          label={t.admin.articles.articleTitle}
          state={state}
          className="md:col-span-2"
          placeholder={t.admin.articles.titlePlaceholder}
          defaultValue={article?.title}
        />
        <TextareaField
          name="excerpt"
          label={t.admin.articles.excerpt}
          hint={t.admin.articles.excerptHint}
          rows={2}
          state={state}
          className="md:col-span-2"
          defaultValue={article?.excerpt}
        />
        <SelectField
          name="category"
          label={t.admin.articles.category}
          state={state}
          options={categoryOptions}
          defaultValue={article?.category ?? "NEWS"}
        />
        <SelectField
          name="raceId"
          label={t.admin.articles.race}
          hint={t.admin.articles.raceHint}
          state={state}
          options={raceOptions}
          placeholder={t.admin.articles.noRace}
          defaultValue={article?.raceId ?? ""}
        />
        <CoverField state={state} current={article?.coverImage} />
        <ArticleBodyEditor state={state} defaultValue={article?.body} options={options} className="md:col-span-2" />
        <SelectField
          name="status"
          label={t.admin.status}
          hint={t.admin.articles.statusHint}
          state={state}
          options={statusOptions}
          defaultValue={article?.status ?? "DRAFT"}
        />
        <CheckboxField
          name="pinned"
          label={t.admin.articles.pinLabel}
          state={state}
          className="self-center"
          defaultChecked={article?.pinned ?? false}
        />
      </FormLayout>
    </form>
  );
}
