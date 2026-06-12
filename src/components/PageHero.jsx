// Небольшая шапка для внутренних страниц (заголовок + подпись)
export default function PageHero({ eyebrow, title, lead }) {
  return (
    <section className="page-hero">
      <div className="container">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-hero__title">{title}</h1>
        {lead && <p className="page-hero__lead">{lead}</p>}
      </div>
    </section>
  )
}
