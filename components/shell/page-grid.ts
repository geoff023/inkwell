// The one page frame for signed-in pages. Same columns everywhere, so the
// content's left edge never jumps between sections:
//   < 1280px  a single reading column (aside stacks after the header)
//   ≥ 1280px  reading column + sticky side column, centred as a pair
// The main column never grows past reading width; extra space on big
// screens goes to the margins, not the line length.
export const railGrid =
  "mx-auto grid w-full max-w-3xl grid-cols-[minmax(0,1fr)] content-start gap-y-8 px-4 py-10 sm:px-6 sm:py-14 xl:max-w-none xl:grid-cols-[minmax(0,46rem)_17rem] xl:justify-center xl:gap-x-14 2xl:grid-cols-[minmax(0,48rem)_19rem] 2xl:gap-x-20";
export const railMain = "min-w-0 xl:col-start-1";
export const railAside = "min-w-0 xl:sticky xl:top-10 xl:col-start-2 xl:row-span-6 xl:row-start-1 xl:self-start";

/** Heading for a block inside the side column. */
export const railHeading = "font-serif text-lg";
/** Heading for a section inside the main column. */
export const sectionHeading = "font-serif text-2xl";
