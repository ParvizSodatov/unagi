import PageHero from '../components/PageHero'
import Menu from '../components/Menu'

export default function MenuPage() {
  return (
    <>
      <PageHero
        eyebrow="меню"
        title="Наше меню"
        lead="Роллы, суши, сеты и напитки — всё свежее, готовим под заказ"
      />
      <Menu />
    </>
  )
}
