export type ScreenshotSlotProps = {
  id: string;
  title: string;
  description: string;
  alt: string;
  src?: string;
  layout?: "card" | "wide" | "portrait";
};

export function ScreenshotSlot({
  id,
  title,
  description,
  alt,
  src,
  layout = "card",
}: ScreenshotSlotProps): JSX.Element {
  const className = `docs-screenshot-slot docs-screenshot-slot--${layout}`;

  return (
    <figure className={className} data-screenshot-slot={id}>
      <div className="docs-screenshot-slot__media">
        {src ? (
          <img src={src} alt={alt} loading="lazy" />
        ) : (
          <div
            className="docs-screenshot-slot__placeholder"
            aria-label={`${title}: место для скриншота`}
          >
            <span>Место для скрина</span>
            <strong>Скриншот добавим перед сдачей</strong>
          </div>
        )}
      </div>
      <figcaption>
        <strong>{title}</strong>
        <span>{description}</span>
      </figcaption>
    </figure>
  );
}
