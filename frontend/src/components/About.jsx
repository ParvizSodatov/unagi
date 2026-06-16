const stats = [
  { num: '2019', label: 'работаем с' },
  { num: '100%', label: 'свежие продукты' },
  { num: '12k+', label: 'довольных гостей' },
]

export default function About() {
  return (
    <section className="section" id="about">
      <div className="container about__inner">
        <div className="about__text">
          <p className="eyebrow">о нас</p>
          <h2 className="section-title">Унаги — это про вкус и качество</h2>
          <p>
            Мы — суши-бар в самом сердце Душанбе. Каждый ролл готовится вручную нашими
            поварами из свежих ингредиентов. Название «Унаги» — в честь того самого
            соуса, что подаётся к суши.
          </p>
          <p>Мы любим то, что делаем, и хотим, чтобы каждый гость уходил довольным.</p>
          <div className="about__stats">
            {stats.map(s => (
              <div className="stat" key={s.label}>
                <span className="stat__num">{s.num}</span>
                <span className="stat__label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="about__image">
          <img src="/img/about.jpg" alt="Суши-бар Унаги" />
        </div>
      </div>
    </section>
  )
}
