export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">
          Kushtet e Shërbimit
        </h1>
        <p className="text-gray-400 text-sm mb-10">
          Përditësuar: Maj 2026
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">1. Pranimi i Kushteve</h2>
          <p className="text-gray-300 leading-relaxed">
            Duke përdorur NearBuy.al, pranoni këto kushte shërbimi. Nëse nuk jeni dakord, 
            ju lutemi mos e përdorni platformën.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">2. Përshkrimi i Shërbimit</h2>
          <p className="text-gray-300 leading-relaxed">
            NearBuy është një platformë lokale kërkimi që lidh blerësit me bizneset dhe 
            profesionistët në Shqipëri. Ne ofrojmë një katalog të centralizuar produktesh 
            dhe shërbimesh.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">3. Llogaritë e Përdoruesve</h2>
          <p className="text-gray-300 leading-relaxed">
            Jeni përgjegjës për ruajtjen e sigurisë së llogarisë suaj. NearBuy nuk mban 
            përgjegjësi për humbjet nga aksesi i paautorizuar në llogarinë tuaj.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">4. Rregullat për Bizneset</h2>
          <p className="text-gray-300 leading-relaxed">
            Bizneset që regjistrohen në NearBuy duhet të ofrojnë informacion të saktë dhe 
            të përditësuar. Çmimet dhe disponueshmëria e produkteve janë përgjegjësi e biznesit. 
            NearBuy rezervon të drejtën të heqë listime që shkelin kushtet e platformës.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">5. Kufizim i Përgjegjësisë</h2>
          <p className="text-gray-300 leading-relaxed">
            NearBuy është një platformë ndërmjetëse. Nuk garantojmë saktësinë e informacionit 
            të postuar nga bizneset dhe nuk mbajmë përgjegjësi për transaksionet ndërmjet 
            blerësve dhe shitësve.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">6. Ndryshimet në Kushte</h2>
          <p className="text-gray-300 leading-relaxed">
            NearBuy rezervon të drejtën të ndryshojë këto kushte në çdo kohë. Ndryshimet 
            hyjnë në fuqi menjëherë pas publikimit. Vazhdimi i përdorimit të platformës 
            pas ndryshimeve nënkupton pranimin e tyre.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">7. Kontakt</h2>
          <p className="text-gray-300 leading-relaxed">
            Për çdo pyetje lidhur me kushtet:{" "}
            <a href="mailto:info@nearbuy.al" className="text-yellow-400 hover:underline">
              info@nearbuy.al
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
