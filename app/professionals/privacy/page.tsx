import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/app/LegalShell";
import { SITE_CONTACT } from "@/lib/siteContact";

export const metadata: Metadata = {
  title: "Politika e privatësisë",
  description: "Si i mbledh, i përdor dhe i mbron NearBuy.al të dhënat personale.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Politika e privatësisë" updated="Tetor 2026" other={{ href: "/terms", label: "Kushtet e përdorimit" }}>
      <section>
        <h2>1. Hyrje</h2>
        <p>Kjo politikë shpjegon cilat të dhëna personale mbledh NearBuy.al, pse i mbledh, me kë i ndan, sa kohë i mban dhe çfarë të drejtash keni. Zbatojmë Ligjin nr. 124/2024 „Për mbrojtjen e të dhënave personale” të Republikës së Shqipërisë.</p>
        <p>Përgjegjës për të dhënat është NearBuy.al. Kontakti: <strong>{SITE_CONTACT.email}</strong>.</p>
      </section>

      <section>
        <h2>2. Çfarë të dhënash mbledhim</h2>
        <ul>
          <li><strong>Kur dërgoni një kërkesë si klient:</strong> emri, numri i telefonit, qyteti, kategoria ose produkti, përshkrimi i punës dhe sa urgjente është. Gjithashtu data e pëlqimit dhe një kod i shifruar i adresës IP, që përdoret vetëm kundër spam-it. Adresën IP nuk e ruajmë të plotë.</li>
          <li><strong>Kur krijoni llogari dyqani ose mjeshtri:</strong> emri, email-i, telefoni dhe WhatsApp-i, emri dhe adresa e biznesit, qyteti, orari, profesioni, fotot, produktet dhe çmimet, si dhe paketa e zgjedhur. Nëse hyni me Google, marrim emrin dhe email-in e llogarisë Google.</li>
          <li><strong>Vendndodhja:</strong> vetëm kur dyqani shtyp butonin për të vendosur vetë vendndodhjen e dyqanit në hartë. Vendndodhjen e vizitorëve nuk e marrim.</li>
          <li><strong>Statistikat:</strong> numërojmë shikimet e profileve dhe klikimet për telefon, WhatsApp dhe hartë, për t’u treguar dyqaneve dhe mjeshtrave sa interes kanë. Këto numra nuk tregojnë kush jeni.</li>
          <li><strong>Vlerësimet:</strong> teksti, nota dhe emri që zgjidhni të shfaqni.</li>
        </ul>
      </section>

      <section>
        <h2>3. Pse i përdorim dhe mbi çfarë baze</h2>
        <ul>
          <li><strong>Pëlqimi juaj:</strong> për t’ua dërguar kërkesën dyqaneve ose mjeshtrave që t’ju kontaktojnë. Pëlqimin e jepni në formular dhe mund ta tërhiqni duke e mbyllur kërkesën ose duke na shkruar.</li>
          <li><strong>Kontrata:</strong> për të krijuar dhe mbajtur llogarinë tuaj, për të shfaqur profilin dhe për të menaxhuar paketën.</li>
          <li><strong>Interesi i ligjshëm:</strong> për sigurinë, parandalimin e spam-it dhe të mashtrimit, dhe për përmirësimin e platformës me statistika të përgjithshme.</li>
          <li><strong>Detyrimi ligjor:</strong> kur ligji ose një autoritet kompetent na e kërkon.</li>
        </ul>
        <p>Nuk i shesim të dhënat tuaja dhe nuk i përdorim për reklama të palëve të treta.</p>
      </section>

      <section>
        <h2>4. Kush i sheh të dhënat</h2>
        <ul>
          <li><strong>Dyqanet dhe mjeshtrat</strong> që marrin kërkesën tuaj shohin emrin, telefonin dhe përshkrimin. Ata mund t’i përdorin vetëm për atë kërkesë.</li>
          <li><strong>Publiku:</strong> profilet e dyqaneve dhe mjeshtrave janë publike: emri, telefoni i punës, adresa, orari, fotot dhe produktet. Këtë e pranoni kur krijoni profilin.</li>
          <li><strong>Ofruesit tanë teknikë</strong>, që i përpunojnë të dhënat vetëm sipas udhëzimeve tona:
            <ul>
              <li>Google Firebase: llogaritë, hyrja dhe baza e të dhënave;</li>
              <li>Vercel: hostimi i faqes dhe statistika vizitash pa cookies, që nuk identifikojnë vizitorin;</li>
              <li>Cloudinary: ruajtja e fotove;</li>
              <li>Resend: dërgimi i email-eve të njoftimit;</li>
              <li>Telegram: njoftime të brendshme vetëm për administratorin e platformës.</li>
            </ul>
          </li>
          <li><strong>Autoritetet:</strong> vetëm kur ligji e kërkon.</li>
        </ul>
        <p>Disa nga këta ofrues i ruajnë të dhënat në serverë jashtë Shqipërisë, në BE ose në SHBA. Zgjedhim ofrues të njohur, që zbatojnë masa mbrojtjeje të pranuara ndërkombëtarisht për transferimin e të dhënave.</p>
      </section>

      <section>
        <h2>5. Sa kohë i mbajmë</h2>
        <ul>
          <li><strong>Kërkesat e klientëve:</strong> janë aktive 3 ditë (produkte) ose 7 ditë (punë), ose më pak nëse i mbyllni. Pas <strong>60 ditësh</strong>, emri, telefoni dhe përshkrimi fshihen automatikisht. Mbeten vetëm të dhëna statistikore pa emër, si qyteti dhe kategoria.</li>
          <li><strong>Llogaritë:</strong> sa kohë llogaria është aktive. Kur kërkoni fshirjen, e fshijmë llogarinë dhe profilin brenda 30 ditëve. Ruajmë vetëm atë që na detyron ligji, p.sh. të dhënat e pagesave.</li>
          <li><strong>Kopjet rezervë:</strong> fshihen në mënyrë të rregullt dhe nuk përdoren për qëllime të tjera.</li>
        </ul>
      </section>

      <section>
        <h2>6. Cookies dhe ruajtja në shfletues</h2>
        <p>Nuk përdorim cookies reklamash. Në shfletuesin tuaj ruajmë vetëm atë që duhet që faqja të funksionojë:</p>
        <ul>
          <li>hyrjen në llogari (Firebase);</li>
          <li>kërkesat që keni dërguar, që të mund t’i mbyllni nga e njëjta pajisje;</li>
          <li>një shënim që e njëjta vizitë të mos numërohet dy herë brenda ditës.</li>
        </ul>
        <p>Këto mund t’i fshini kur të doni nga cilësimet e shfletuesit.</p>
      </section>

      <section>
        <h2>7. Të drejtat tuaja</h2>
        <p>Sipas ligjit, keni të drejtë:</p>
        <ul>
          <li>të dini nëse i përpunojmë të dhënat tuaja dhe të merrni një kopje;</li>
          <li>t’i korrigjoni kur janë të pasakta;</li>
          <li>të kërkoni fshirjen e tyre;</li>
          <li>të kufizoni ose të kundërshtoni përpunimin;</li>
          <li>t’i merrni në një format të lexueshëm (transferueshmëria);</li>
          <li>të tërhiqni pëlqimin në çdo kohë.</li>
        </ul>
        <p>Na shkruani te <strong>{SITE_CONTACT.email}</strong>. Përgjigjemi brenda 30 ditëve dhe mund t’ju kërkojmë të vërtetoni që jeni ju, p.sh. me një mesazh nga i njëjti numër telefoni. Nëse s’doni më të kontaktoheni për një kërkesë, mjafton ta mbyllni ose të na shkruani.</p>
      </section>

      <section>
        <h2>8. Siguria</h2>
        <p>Përdorim lidhje të shifruar (HTTPS), hyrje të sigurt në llogari dhe rregulla që lejojnë çdo përdorues të shohë vetëm të dhënat që i takojnë. Telefonat e klientëve u shfaqen vetëm dyqaneve dhe mjeshtrave që marrin kërkesën. Asnjë sistem nuk është 100% i sigurt. Nëse ndodh një incident që rrezikon të dhënat tuaja, njoftojmë ata që preken dhe Komisionerin, siç e kërkon ligji.</p>
      </section>

      <section>
        <h2>9. Të miturit</h2>
        <p>Platforma nuk është për persona nën 18 vjeç. Nuk mbledhim me dashje të dhëna nga të miturit. Nëse mendoni se një i mitur na ka dhënë të dhëna, na shkruani dhe do t’i fshijmë.</p>
      </section>

      <section>
        <h2>10. Ndryshimet</h2>
        <p>Mund ta përditësojmë këtë politikë. Data në krye tregon versionin e fundit. Për ndryshime të rëndësishme, njoftojmë përdoruesit me llogari me email ose në panel.</p>
      </section>

      <section>
        <h2>11. Ankesat</h2>
        <p>Nëse mendoni se të dhënat tuaja nuk po trajtohen siç duhet, na shkruani fillimisht ne. Keni gjithashtu të drejtë të ankoheni te Komisioneri për të Drejtën e Informimit dhe Mbrojtjen e të Dhënave Personale: <a href="https://www.idp.al" target="_blank" rel="noopener noreferrer">idp.al</a>.</p>
        <p>Shihni edhe <Link href="/terms">Kushtet e përdorimit</Link>.</p>
      </section>
    </LegalShell>
  );
}
