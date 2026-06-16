import PageHero from '../components/PageHero'
import About from '../components/About'
import Features from '../components/Features'
import DeliveryInfo from '../components/DeliveryInfo'
import Delivery from '../components/Delivery'

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="о нас"
        title="О суши-баре Унаги"
        lead="Немного о том, кто мы и почему нас любят в Душанбе"
      />
      <About />
      <Features />
      <DeliveryInfo />
      <Delivery />
    </>
  )
}
