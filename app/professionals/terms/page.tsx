import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/app/LegalShell";
import { SITE_CONTACT } from "@/lib/siteContact";

export const metadata: Metadata = {
  title: "Kushtet e përdorimit",
  description: "Rregullat për përdorimin e NearBuy.al nga klientët, dyqanet dhe mjeshtrat.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Kushtet e përdorimit" updated="Tetor 2026" other={{ href: "/privacy", label: "Politika e privatësisë" }}>
      <section>
        <h2>1. Kush jemi</h2>
        <p>NearBuy.al („platforma”, „ne”) është një platformë online që ndihmon njerëzit në Shqipëri të gjejnë materiale ndërtimi në dyqanet pranë tyre dhe mjeshtër për punë në shtëpi. Duke përdorur platformën, pranoni këto kushte. Nëse nuk jeni dakord, ju lutemi mos e përdorni.</p>
      </section>

      <section>
        <h2>2. Çfarë bën platforma dhe çfarë nuk bën</h2>
        <p>NearBuy.al është <strong>ndërmjetës informacioni</strong>. Ne shfaqim dyqanet, produktet, çmimet dhe mjeshtrat sipas të dhënave që ata vetë vendosin, dhe i lidhim klientët me ta.</p>
        <ul>
          <li>Nuk shesim produkte dhe nuk kryejmë punë. Blerja ose marrëveshja për punën bëhet drejtpërdrejt mes klientit dhe dyqanit ose mjeshtrit.</li>
          <li>Nuk mbledhim pagesa për produkte ose shërbime përmes platformës.</li>
          <li>Çmimet, gjendja në magazinë dhe disponueshmëria i vendosin dyqanet. Mund të ndryshojnë pa u përditësuar menjëherë, prandaj konfirmojini me dyqanin para blerjes.</li>
        </ul>
      </section>

      <section>
        <h2>3. Përdorimi pa llogari dhe kërkesat e klientëve</h2>
        <p>Klientët mund ta përdorin platformën pa llogari. Kur dërgoni një kërkesë për një produkt ose një punë:</p>
        <ul>
          <li>Emri, numri i telefonit, qyteti dhe përshkrimi i kërkesës u dërgohen <strong>disa dyqaneve ose mjeshtrave</strong> në kategorinë dhe zonën përkatëse, që t’ju kontaktojnë me telefon ose WhatsApp.</li>
          <li>Kërkesa skadon vetë pas <strong>3 ditësh</strong> (produkte) ose <strong>7 ditësh</strong> (punë). Mund ta mbyllni edhe më parë nga e njëjta pajisje, që të mos ju kontaktojë më njeri për të.</li>
          <li>Për të ndaluar abuzimin, numri i kërkesave në ditë është i kufizuar dhe pranohen vetëm numra celulari shqiptarë.</li>
          <li>Dërgoni vetëm numrin tuaj dhe kërkesa të vërteta.</li>
        </ul>
      </section>

      <section>
        <h2>4. Llogaritë e dyqaneve dhe mjeshtrave</h2>
        <p>Për t’u shfaqur në platformë, dyqanet dhe mjeshtrat krijojnë llogari. Jeni përgjegjës për:</p>
        <ul>
          <li>saktësinë e të dhënave: emri, adresa, telefoni, produktet, çmimet, fotot dhe përshkrimi i punës;</li>
          <li>ruajtjen e fjalëkalimit dhe çdo veprim që bëhet me llogarinë tuaj;</li>
          <li>lejet, licencat dhe detyrimet ligjore të aktivitetit tuaj;</li>
          <li>sjelljen korrekte me klientët dhe respektimin e çmimeve që shfaqni.</li>
        </ul>
        <p>Profilet kontrollohen nga ne para se të shfaqen publikisht. Mund të refuzojmë, fshehim ose mbyllim profile me të dhëna të rreme, të paplota ose që shkelin këto kushte.</p>
      </section>

      <section>
        <h2>5. Përdorimi i kontakteve të klientëve</h2>
        <p>Dyqanet dhe mjeshtrat që marrin kërkesa klientësh pranojnë që:</p>
        <ul>
          <li>numrin e klientit ta përdorin <strong>vetëm për atë kërkesë</strong>;</li>
          <li>të mos ia japin të tjerëve, të mos e shtojnë në lista reklamash dhe të mos i dërgojnë mesazhe promocionale;</li>
          <li>të mos e kontaktojnë më klientin kur kërkesa shfaqet e mbyllur ose kur ai thotë se nuk është më i interesuar.</li>
        </ul>
        <p>Shkelja e këtyre rregullave çon në mbylljen e llogarisë.</p>
      </section>

      <section>
        <h2>6. Paketat me pagesë</h2>
        <ul>
          <li>Përdorimi bazë është falas. Paketat me pagesë japin më shumë produkte ose foto, renditje më lart, kërkesat e klientëve dhe statistika më të plota.</li>
          <li>Çmimet dhe përfitimet aktuale shfaqen në panelin e llogarisë. Vlen çmimi i shfaqur në momentin kur kërkoni paketën.</li>
          <li>Paketa aktivizohet pasi ju kontaktojmë dhe konfirmohet pagesa. Ajo vlen deri në datën e shfaqur në panel. <strong>Nuk rinovohet automatikisht.</strong> Nëse nuk rinovohet, llogaria kalon te paketa falas pa humbur të dhënat.</li>
          <li>Kur ka ofertë prove (p.sh. 30 ditë falas), pas afatit llogaria kalon te paketa falas, përveç nëse zgjidhni të paguani.</li>
          <li>Pagesat për periudhën e nisur nuk kthehen, përveç rasteve kur shërbimi nuk u ofrua për fajin tonë.</li>
        </ul>
      </section>

      <section>
        <h2>7. Renditja dhe shenja „I rekomanduar”</h2>
        <p>Renditja në rezultate varet nga përputhja me kërkimin, qyteti dhe paketa. Dyqanet dhe mjeshtrat me paketë më të lartë shfaqen më lart. Shenja „⭐ I rekomanduar” tregon një <strong>paketë me pagesë</strong>; nuk është garanci cilësie nga ana jonë. Me disa paketa, kërkesat e klientëve shihen pak më herët.</p>
      </section>

      <section>
        <h2>8. Vlerësimet</h2>
        <p>Vlerësimet duhet të bazohen në një përvojë reale. Ndalohen vlerësimet e rreme, ato për veten ose kundër konkurrentëve, si dhe gjuha fyese. Mund të fshijmë vlerësime që i shkelin këto rregulla.</p>
      </section>

      <section>
        <h2>9. Ndalime</h2>
        <ul>
          <li>Informacion i rremë ose mashtrues, ose paraqitja si dikush tjetër.</li>
          <li>Produkte ose shërbime të paligjshme.</li>
          <li>Kërkesa false, spam ose përdorimi i numrave të të tjerëve.</li>
          <li>Kopjimi masiv i të dhënave të platformës me programe automatike.</li>
          <li>Përpjekje për të hyrë pa leje në sistemet tona ose për t’i dëmtuar ato.</li>
        </ul>
      </section>

      <section>
        <h2>10. Përmbajtja dhe pronësia</h2>
        <p>Logoja, emri, dizajni dhe kodi i NearBuy.al janë tonat. Fotot dhe përshkrimet që ngarkoni mbeten tuajat, por na jepni të drejtën t’i shfaqim në platformë dhe në promovimin e saj për sa kohë profili është aktiv. Ngarkoni vetëm materiale që keni të drejtë t’i përdorni.</p>
      </section>

      <section>
        <h2>11. Kufizimi i përgjegjësisë</h2>
        <p>Përpiqemi që platforma të jetë e saktë dhe në punë, por nuk garantojmë që do të jetë gjithmonë pa ndërprerje ose gabime. Nuk mbajmë përgjegjësi për:</p>
        <ul>
          <li>cilësinë, çmimin ose dorëzimin e produkteve dhe punëve;</li>
          <li>marrëveshjet dhe mosmarrëveshjet mes klientëve, dyqaneve dhe mjeshtrave;</li>
          <li>dëme nga informacion i pasaktë i vendosur nga përdoruesit.</li>
        </ul>
        <p>Kjo nuk kufizon të drejtat që ju jep ligji për mbrojtjen e konsumatorit.</p>
      </section>

      <section>
        <h2>12. Ndryshimet</h2>
        <p>Mund t’i përditësojmë këto kushte. Data në krye tregon versionin e fundit. Për ndryshime të rëndësishme, njoftojmë dyqanet dhe mjeshtrat me email ose në panel.</p>
      </section>

      <section>
        <h2>13. Ligji i zbatueshëm</h2>
        <p>Këto kushte rregullohen nga ligjet e Republikës së Shqipërisë. Mosmarrëveshjet përpiqemi t’i zgjidhim fillimisht me marrëveshje. Nëse nuk ia dalim, ato shqyrtohen nga gjykatat kompetente shqiptare.</p>
      </section>

      <section>
        <h2>14. Kontakti</h2>
        <p>Email: <strong>{SITE_CONTACT.email}</strong> · Telefon/WhatsApp: <strong>{SITE_CONTACT.phone}</strong></p>
        <p>Për të dhënat personale, shihni <Link href="/privacy">Politikën e privatësisë</Link>.</p>
      </section>
    </LegalShell>
  );
}
