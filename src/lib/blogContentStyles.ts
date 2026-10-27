// Styles for raw HTML blog content. Tailwind's preflight strips default
// heading/list styles, so every supported tag is styled explicitly here.
export const blogContentClasses = [
  'leading-relaxed text-foreground break-words',
  '[&_p]:mb-4',
  '[&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight',
  '[&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-tight',
  '[&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:leading-snug',
  '[&_h4]:mt-6 [&_h4]:mb-3 [&_h4]:text-lg [&_h4]:font-bold [&_h4]:leading-snug',
  '[&_h5]:mt-4 [&_h5]:mb-2 [&_h5]:text-base [&_h5]:font-semibold',
  '[&_h6]:mt-4 [&_h6]:mb-2 [&_h6]:text-sm [&_h6]:font-semibold [&_h6]:uppercase [&_h6]:tracking-wide',
  '[&_small]:text-sm [&_small]:text-muted-foreground',
  '[&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic',
  '[&_hr]:my-8 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-border',
  '[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1',
  '[&_a]:font-semibold [&_a]:text-primary [&_a:hover]:underline',
  '[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic',
  '[&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg',
].join(' ');
