export type ScreenshotSlotProps = {
  id: string;
  title: string;
  description: string;
  alt: string;
  src?: string;
};

export function ScreenshotSlot({
  id,
  title,
  description,
  alt,
  src,
}: ScreenshotSlotProps): JSX.Element {
  return (
    <figure className="docs-screenshot-slot" data-screenshot-slot={id}>
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
