export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">
          Politika e Privatësisë
        </h1>
        <p className="text-gray-400 text-sm mb-10">
          Përditësuar: Maj 2026
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">1. Çfarë të dhënash mbledhim</h2>
          <p className="text-gray-300 leading-relaxed">
            NearBuy mbledh të dhëna që ju jepni drejtpërdrejt: emrin, adresën e email-it, 
            fjalëkalimin, dhe informacionin e profilit. Gjithashtu mbledhim të dhëna të 
            përdorimit si kërkimet dhe produktet që shikoni.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">2. Si i përdorim të dhënat</h2>
          <p className="text-gray-300 leading-relaxed">
            Të dhënat tuaja përdoren për të ofruar shërbimin, për të personalizuar përvojën 
            tuaj, dhe për t'ju dërguar njoftime relevante. Nuk shesim të dhënat tuaja te palë të treta.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">3. Ruajtja e të dhënave</h2>
          <p className="text-gray-300 leading-relaxed">
            Të dhënat ruhen në mënyrë të sigurt përmes Firebase (Google Cloud). Të dhënat 
            mbahen për aq kohë sa llogaria juaj është aktive ose sipas kërkesave ligjore.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">4. Të drejtat tuaja</h2>
          <p className="text-gray-300 leading-relaxed">
            Keni të drejtë të aksesoni, korrigjoni ose fshini të dhënat tuaja personale. 
            Për çdo kërkesë kontaktoni:{" "}
            <a href="mailto:info@nearbuy.al" className="text-yellow-400 hover:underline">
              info@nearbuy.al
            </a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">5. Cookies</h2>
          <p className="text-gray-300 leading-relaxed">
            NearBuy përdor cookies për autentifikim dhe për të mbajtur sesionin tuaj aktiv. 
            Mund t'i çaktivizoni cookies nga cilësimet e browser-it, por kjo mund të ndikojë 
            në funksionimin e platformës.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">6. Kontakt</h2>
          <p className="text-gray-300 leading-relaxed">
            Për çdo pyetje lidhur me privatësinë:{" "}
            <a href="mailto:info@nearbuy.al" className="text-yellow-400 hover:underline">
              info@nearbuy.al
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
