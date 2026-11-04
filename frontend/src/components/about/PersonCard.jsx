import { UserRound } from "lucide-react";
import Image from "next/image";

/**
 * Board or advisor card on /about (PAGES.md item 6): photo, name, role. The API sends `photo: null` without the
 * person's consent (DATA_MODEL.md Person.photo_consent); the card then shows a neutral icon, never a stock face.
 * @param {{ person: { name: string, role: string, bio?: string, photo: { url: string, alt: string } | null } }} props
 */
export default function PersonCard({ person }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-sand-200 bg-white text-center">
      <div className="relative aspect-square bg-em-50">
        {person.photo ? (
          <Image
            src={person.photo.url}
            alt={person.photo.alt}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div aria-hidden="true" className="grid h-full place-items-center">
            <UserRound className="size-1/3 text-em-700/40" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="font-head text-base leading-snug font-bold break-words text-em-900 sm:text-lg">{person.name}</h3>
        <p className="mt-1 text-sm font-semibold text-gold-600">{person.role}</p>
        {person.bio && <p className="mt-2 hidden text-sm leading-6 text-em-900/70 sm:block">{person.bio}</p>}
      </div>
    </article>
  );
}
