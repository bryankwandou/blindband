/**
 * Three languages, one dictionary, no runtime translation service.
 *
 * English is the source text and the default route. Indonesian and Chinese are
 * hand-written rather than machine-passed, because the whole subject here is
 * whether a claim can be checked — a page that mistranslates "withheld" as
 * "hidden" would be saying something materially different about the product.
 *
 * The shape is enforced by `Dictionary`, so a missing key is a build error
 * rather than a blank space someone notices in production.
 */

export const LOCALES = ["en", "id", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  id: "Bahasa Indonesia",
  zh: "中文",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

interface Gate {
  name: string;
  rule: string;
  body: string;
}

interface Step {
  kicker: string;
  title: string;
  body: string;
}

interface Faq {
  q: string;
  a: string;
}

export interface Dictionary {
  meta: { title: string; description: string };
  nav: {
    round: string;
    verify: string;
    docs: string;
    source: string;
    skip: string;
    themeLight: string;
    themeDark: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    lede: string;
    primary: string;
    secondary: string;
    stats: { published: string; withheld: string; contributors: string; rows: string };
    proof: {
      label: string;
      median: string;
      withheld: string;
      digest: string;
      anchored: string;
    };
  };
  problem: {
    kicker: string;
    title: string;
    body: string;
    aside: string;
  };
  how: { kicker: string; title: string; steps: [Step, Step, Step]; caption: string };
  gates: {
    kicker: string;
    title: string;
    lede: string;
    items: [Gate, Gate, Gate, Gate];
    note: string;
  };
  round: {
    kicker: string;
    title: string;
    lede: string;
    tableRole: string;
    tableSpread: string;
    tableContributors: string;
    tableRecords: string;
    tableShare: string;
    withheldTitle: string;
    withheldLede: string;
    reasons: Record<string, string>;
    open: string;
  };
  verify: {
    kicker: string;
    title: string;
    lede: string;
    step1: string;
    step1Body: string;
    step2: string;
    step2Body: string;
    step3: string;
    step3Body: string;
    recompute: string;
    recomputing: string;
    match: string;
    mismatch: string;
    onChain: string;
    inputLabel: string;
    inputHint: string;
    check: string;
    tryOne: string;
    resultIn: string;
    resultWithheld: string;
    resultNone: string;
    open: string;
    sampleNote: string;
  };
  faq: { kicker: string; title: string; items: Faq[] };
  cta: { title: string; body: string; primary: string; secondary: string };
  footer: { built: string; disclaimer: string; language: string };
  pages: {
    round: { title: string; lede: string; back: string; totals: string; attestation: string; anchor: string };
    verify: { title: string; lede: string; back: string };
    docs: {
      title: string;
      lede: string;
      back: string;
      runTitle: string;
      runLede: string;
      layoutTitle: string;
      layoutLede: string;
      bugsTitle: string;
      bugsLede: string;
      bugsEnOnly: string;
      bugPlatform: string;
      bugOurs: string;
      bugSymptom: string;
      bugCause: string;
      bugFix: string;
      bugCost: string;
      handoverTitle: string;
      handoverBody: string;
    };
  };
}

const en: Dictionary = {
  meta: {
    title: "Blindband — pay benchmarks nobody has to trust",
    description:
      "Members submit payroll rows that stay sealed inside a TEE. The aggregate is published only when it clears four antitrust safe-harbour gates, and its digest is anchored on Solana so it cannot be quietly rewritten.",
  },
  nav: {
    round: "The round",
    verify: "Verify",
    docs: "Docs",
    source: "Source",
    skip: "Skip to content",
    themeLight: "Switch to the light theme",
    themeDark: "Switch to the dark theme",
  },
  hero: {
    eyebrow: "Confidential benchmarking on Terminal 3",
    title: "Salary benchmarks that survive",
    titleAccent: "being checked.",
    lede:
      "Competitors will not email each other payroll, and lawyers will not let them. Blindband takes the sealed rows into an enclave, publishes a band only when it clears four safe-harbour gates, and writes the result's fingerprint to a public ledger. You do not have to believe the operator. You can recompute the number yourself.",
    primary: "Read the live round",
    secondary: "Check a receipt",
    stats: {
      published: "bands published",
      withheld: "cells withheld",
      contributors: "contributing firms",
      rows: "sealed rows",
    },
    proof: {
      label: "What the enclave returned",
      median: "median",
      withheld: "withheld",
      digest: "round digest",
      anchored: "Anchored on Solana devnet",
    },
  },
  problem: {
    kicker: "The problem",
    title: "Every pay survey asks you to trust a stranger with your payroll.",
    body:
      "The usual arrangement is a vendor: each firm mails a spreadsheet, the vendor promises to keep it confidential, and months later a PDF comes back. The firms cannot see what happened in between. Neither can their regulators. And the one rule that actually matters — that a benchmark must not become a channel for competitors to read each other's current pay — is enforced by nothing more than an assurance.",
    aside:
      "Antitrust authorities are explicit about this. Information exchange between competitors is defensible when a neutral party aggregates it, when the data is historical, when enough independent firms contribute, and when no single firm's numbers dominate the result. Those four conditions are the whole design here.",
  },
  how: {
    kicker: "How it runs",
    title: "Three moves, and only one of them requires trusting anything.",
    steps: [
      {
        kicker: "01",
        title: "Rows go in sealed",
        body:
          "Each member posts its rows to a contract running inside a trusted execution environment. The rows land in a private key-value map that only the contract's own identity can read. There is no operator console that opens them, because there is no code path that returns them.",
      },
      {
        kicker: "02",
        title: "The enclave decides what may be said",
        body:
          "The aggregation runs where nobody can watch it. Every cell is tested against the four gates. A cell that passes is published as a percentile band. A cell that fails is named, with the reason it failed, and its numbers are never emitted — not to members, not to the operator.",
      },
      {
        kicker: "03",
        title: "The result is pinned in public",
        body:
          "The published round is hashed, the digest is bound into the transaction receipt, and the same digest is written to Solana as a memo. That gives the round an independent timestamp and an append-only history, so a round cannot be swapped for a friendlier one after the fact.",
      },
    ],
    caption:
      "The contract asks for three host capabilities: key-value storage, logging, and tenant context. It does not ask for outbound HTTP, so there is no egress surface to review.",
  },
  gates: {
    kicker: "The ruleset",
    title: "Four gates, applied before anything leaves the enclave.",
    lede:
      "These are not tuning knobs. They are compiled into the contract and named in the published round, so a member can see which ruleset produced the number they are reading.",
    items: [
      {
        name: "Neutral aggregator",
        rule: "no member sees another's rows",
        body:
          "The aggregation runs inside the enclave and the sealed map is scoped to the contract identity alone. Members receive bands, never rows.",
      },
      {
        name: "Historical data",
        rule: "effective date at least 91 days old",
        body:
          "Anything more recent is dropped from the round and counted in the totals. Current pay is the figure competitors are not permitted to swap; stale pay is the figure they are.",
      },
      {
        name: "Contributor floor",
        rule: "at least 5 firms and 10 rows per cell",
        body:
          "Below that, a band starts to describe individuals rather than a market. The cell is named as withheld and its statistics are discarded.",
      },
      {
        name: "Concentration ceiling",
        rule: "no firm above 25% of a cell",
        body:
          "A band that is mostly one employer is that employer's payroll wearing a market's clothes. Over the ceiling, the cell is withheld.",
      },
    ],
    note:
      "Blindband is engineering, not legal advice. The gates follow published safe-harbour guidance; whether they fit a particular consortium is a question for that consortium's counsel.",
  },
  round: {
    kicker: "Live round",
    title: "What the enclave published, and what it refused to.",
    lede:
      "Everything below came out of a real contract execution on the Terminal 3 sandbox and is anchored on Solana devnet. Nothing on this page is illustrative.",
    tableRole: "Role and level",
    tableSpread: "P10 · median · P90",
    tableContributors: "Firms",
    tableRecords: "Rows",
    tableShare: "Top firm",
    withheldTitle: "Withheld",
    withheldLede:
      "These cells had data. The enclave computed them and then declined to publish, which is the part of the system that is worth anything.",
    reasons: {
      below_contributor_floor: "Fewer than five independent firms contributed to this cell.",
      contributor_concentration_exceeded:
        "One firm accounted for more than a quarter of the cell's rows.",
      below_record_floor: "Fewer than ten rows landed in this cell.",
    },
    open: "Open the full round",
  },
  verify: {
    kicker: "Verification",
    title: "Check it here, in your own browser.",
    lede:
      "Two of the three checks need nothing from us. Your browser hashes the round file it just downloaded and compares that against the fingerprint recorded on Solana. If an operator ever served you a different round, these two numbers would part company.",
    step1: "Recompute the digest",
    step1Body:
      "SHA-256 over the exact bytes of the published round, computed locally with the Web Crypto API.",
    step2: "Read the anchor",
    step2Body:
      "The same digest, written to Solana devnet as a memo at the slot shown. Public, timestamped, and not ours to edit.",
    step3: "Prove a receipt belongs",
    step3Body:
      "Each accepted row returns a commitment. Ask whether that commitment is in the round, and whether its cell reached a published band.",
    recompute: "Hash the round in my browser",
    recomputing: "Hashing…",
    match: "Matches the anchored digest",
    mismatch: "Does not match — do not trust this round",
    onChain: "View the anchor on Solana",
    inputLabel: "Receipt commitment",
    inputHint: "64 hexadecimal characters, as returned when the row was accepted.",
    check: "Check receipt",
    tryOne: "Try a sample",
    resultIn: "In the round, and counted toward a published band.",
    resultWithheld: "In the round. Its cell was withheld, so no band was published for it.",
    resultNone: "No row in this round carries that commitment.",
    open: "Open the verifier",
    sampleNote:
      "The receipt lookup on this page answers from the sample set shipped with the site, so it works offline and spends nobody's credits. The authoritative answer comes from the enclave: `npm run verify` in the repository asks the contract directly, and includes a deliberately forged commitment as a control.",
  },
  faq: {
    kicker: "Questions",
    title: "The awkward ones first.",
    items: [
      {
        q: "Could the operator read the submissions anyway?",
        a: "There is no function that returns a row. The sealed map's access list names the contract identity and nothing else, and the contract exposes submit, aggregate, read-round and check-receipt. Adding a read path would mean registering a new contract version under a new identity, which is a visible act, not a quiet one.",
      },
      {
        q: "What stops a round being replaced later?",
        a: "The digest on Solana. Republishing a different round under the same identifier produces a different hash, and the original memo stays where it is with its original block time. The substitution does not become impossible — it becomes obvious.",
      },
      {
        q: "Why is a whole cell thrown away over one dominant contributor?",
        a: "Because a band drawn mostly from one employer tells the other members what that employer pays. That is the exchange the safe-harbour conditions exist to prevent, and publishing it with a footnote would not fix it.",
      },
      {
        q: "What does a member actually get back?",
        a: "A receipt per accepted row, and the published bands. The receipt proves the row was counted without revealing it. Nothing in the response describes another member's data.",
      },
      {
        q: "Is this ready for a real consortium?",
        a: "The pipeline is real and the gates work, but it runs on a sandbox tenant with test credits, and rounds currently execute under the tenant identity rather than a delegated agent key. Those are the two things to close before anyone's actual payroll goes near it.",
      },
    ],
  },
  cta: {
    title: "Run a round yourself.",
    body: "The contract, the agent and this site are one repository. Deploy, submit, aggregate, anchor, verify — five commands, and the last one tells you whether to believe the first four.",
    primary: "Read the source",
    secondary: "How to run it",
  },
  footer: {
    built: "Built on Terminal 3 · anchored on Solana devnet",
    disclaimer:
      "Demonstration data. Figures are synthetic and describe no real employer.",
    language: "Language",
  },
  pages: {
    round: {
      title: "Round 2026-q1",
      lede: "The complete published round, exactly as the enclave returned it.",
      back: "Back",
      totals: "Totals",
      attestation: "Attestation",
      anchor: "Anchor",
    },
    verify: {
      title: "Verify a round",
      lede: "Recompute the digest, compare it with the ledger, and check a receipt against the enclave.",
      back: "Back",
    },
    docs: {
      title: "Running and maintaining Blindband",
      lede: "What it is made of, how to run a round, and what broke while building it.",
      back: "Back",
      runTitle: "Running a round",
      runLede: "Five commands, in order. Each one refuses to proceed if the previous left something inconsistent.",
      layoutTitle: "Repository layout",
      layoutLede: "Three parts, split so the interesting logic can be tested without a node, an enclave, or credits.",
      bugsTitle: "Bugs and platform notes",
      bugsLede: "Everything below cost real time. They are written down so the next person spends it on something else.",
      bugsEnOnly:
        "These stay in English in every language, so they can be forwarded to Terminal 3 exactly as written — a translated error string does not match anything in their logs.",
      bugPlatform: "Platform",
      bugOurs: "Ours",
      bugSymptom: "Symptom",
      bugCause: "Cause",
      bugFix: "Fix",
      bugCost: "Cost",
      handoverTitle: "Continuing or handing over",
      handoverBody:
        "I would like to keep running this and take it toward a real consortium pilot. If Terminal 3 would rather host it, the handover is small: the repository is self-contained, the deploy script is idempotent, and the only state outside git is the tenant DID, the contract identity and the map access lists — all of which are recorded in state.json and reproducible with a single deploy.",
    },
  },
};

const id: Dictionary = {
  meta: {
    title: "Blindband — tolok ukur gaji yang tahan diperiksa",
    description:
      "Anggota mengirim baris payroll yang tetap tersegel di dalam TEE. Agregat baru diterbitkan setelah lolos empat gerbang safe-harbour antitrust, dan sidik jarinya ditambatkan di Solana agar tidak bisa diam-diam diubah.",
  },
  nav: {
    round: "Ronde",
    verify: "Verifikasi",
    docs: "Dokumentasi",
    source: "Kode",
    skip: "Lewati ke konten",
    themeLight: "Ganti ke tema terang",
    themeDark: "Ganti ke tema gelap",
  },
  hero: {
    eyebrow: "Benchmarking rahasia di atas Terminal 3",
    title: "Tolok ukur gaji yang tahan",
    titleAccent: "diperiksa.",
    lede:
      "Pesaing tidak akan saling mengirim data payroll, dan bagian hukum tidak akan mengizinkannya. Blindband membawa baris tersegel itu ke dalam enclave, menerbitkan sebuah band hanya bila lolos empat gerbang safe-harbour, lalu menulis sidik jari hasilnya ke ledger publik. Anda tidak perlu percaya pada operatornya. Angkanya bisa Anda hitung ulang sendiri.",
    primary: "Baca ronde langsung",
    secondary: "Periksa tanda terima",
    stats: {
      published: "band terbit",
      withheld: "sel ditahan",
      contributors: "perusahaan penyumbang",
      rows: "baris tersegel",
    },
    proof: {
      label: "Yang dikembalikan enclave",
      median: "median",
      withheld: "ditahan",
      digest: "sidik jari ronde",
      anchored: "Ditambatkan di Solana devnet",
    },
  },
  problem: {
    kicker: "Masalahnya",
    title: "Setiap survei gaji meminta Anda menitipkan payroll kepada orang asing.",
    body:
      "Pola yang biasa dipakai adalah vendor: tiap perusahaan mengirim spreadsheet, vendor berjanji menjaga kerahasiaannya, lalu beberapa bulan kemudian sebuah PDF kembali. Perusahaan tidak bisa melihat apa yang terjadi di antaranya. Regulator pun tidak. Dan satu aturan yang benar-benar penting — bahwa benchmark tidak boleh menjadi saluran bagi pesaing untuk saling membaca gaji terkini — hanya dijaga oleh sebuah janji.",
    aside:
      "Otoritas persaingan usaha menyatakannya dengan gamblang. Pertukaran informasi antarpesaing masih bisa dipertahankan bila ada pihak netral yang mengagregasi, bila datanya historis, bila cukup banyak perusahaan independen yang menyumbang, dan bila tidak ada satu perusahaan pun yang mendominasi hasilnya. Empat syarat itulah seluruh rancangan sistem ini.",
  },
  how: {
    kicker: "Cara kerjanya",
    title: "Tiga langkah, dan hanya satu yang menuntut kepercayaan.",
    steps: [
      {
        kicker: "01",
        title: "Baris masuk dalam keadaan tersegel",
        body:
          "Setiap anggota mengirim barisnya ke kontrak yang berjalan di dalam trusted execution environment. Baris itu mendarat di peta key-value privat yang hanya bisa dibaca oleh identitas kontraknya sendiri. Tidak ada konsol operator yang bisa membukanya, sebab tidak ada jalur kode yang mengembalikannya.",
      },
      {
        kicker: "02",
        title: "Enclave menentukan apa yang boleh diucapkan",
        body:
          "Agregasi berjalan di tempat yang tidak bisa diintip siapa pun. Setiap sel diuji terhadap empat gerbang. Sel yang lolos diterbitkan sebagai band persentil. Sel yang gagal disebutkan namanya beserta alasannya, dan angkanya tidak pernah dikeluarkan — tidak kepada anggota, tidak pula kepada operator.",
      },
      {
        kicker: "03",
        title: "Hasilnya dipaku di ruang publik",
        body:
          "Ronde yang terbit di-hash, digest-nya diikat ke tanda terima transaksi, dan digest yang sama ditulis ke Solana sebagai memo. Ronde itu jadi punya penanda waktu independen dan riwayat yang hanya bisa bertambah, sehingga tidak bisa ditukar dengan versi yang lebih ramah setelahnya.",
      },
    ],
    caption:
      "Kontrak ini meminta tiga kapabilitas host: penyimpanan key-value, logging, dan tenant context. Ia tidak meminta HTTP keluar, jadi tidak ada permukaan egress yang perlu ditinjau.",
  },
  gates: {
    kicker: "Aturan main",
    title: "Empat gerbang, diterapkan sebelum apa pun keluar dari enclave.",
    lede:
      "Ini bukan tombol yang bisa diputar sesuka hati. Semuanya dikompilasi ke dalam kontrak dan disebutkan di ronde yang terbit, sehingga anggota tahu ruleset mana yang menghasilkan angka yang sedang mereka baca.",
    items: [
      {
        name: "Agregator netral",
        rule: "tidak ada anggota yang melihat baris anggota lain",
        body:
          "Agregasi berjalan di dalam enclave dan peta tersegelnya hanya dicakupkan pada identitas kontrak. Anggota menerima band, bukan baris.",
      },
      {
        name: "Data historis",
        rule: "tanggal berlaku minimal 91 hari",
        body:
          "Apa pun yang lebih baru dibuang dari ronde dan dihitung di bagian total. Gaji terkini adalah angka yang tidak boleh dipertukarkan pesaing; gaji lama adalah angka yang boleh.",
      },
      {
        name: "Batas bawah penyumbang",
        rule: "minimal 5 perusahaan dan 10 baris per sel",
        body:
          "Di bawah itu, sebuah band mulai menggambarkan individu alih-alih pasar. Selnya disebut sebagai ditahan dan statistiknya dibuang.",
      },
      {
        name: "Batas atas konsentrasi",
        rule: "tidak ada perusahaan di atas 25% satu sel",
        body:
          "Band yang isinya sebagian besar satu pemberi kerja sebenarnya adalah payroll perusahaan itu yang menyamar sebagai pasar. Lewat batas, sel ditahan.",
      },
    ],
    note:
      "Blindband adalah pekerjaan teknik, bukan nasihat hukum. Gerbangnya mengikuti panduan safe-harbour yang dipublikasikan; apakah itu cocok untuk sebuah konsorsium tertentu adalah pertanyaan untuk penasihat hukum konsorsium tersebut.",
  },
  round: {
    kicker: "Ronde langsung",
    title: "Yang diterbitkan enclave, dan yang ditolaknya.",
    lede:
      "Semua di bawah ini berasal dari eksekusi kontrak sungguhan di sandbox Terminal 3 dan ditambatkan di Solana devnet. Tidak ada yang bersifat ilustrasi.",
    tableRole: "Peran dan level",
    tableSpread: "P10 · median · P90",
    tableContributors: "Perusahaan",
    tableRecords: "Baris",
    tableShare: "Terbesar",
    withheldTitle: "Ditahan",
    withheldLede:
      "Sel-sel ini punya data. Enclave menghitungnya lalu menolak menerbitkannya, dan justru bagian itulah yang membuat sistem ini bernilai.",
    reasons: {
      below_contributor_floor: "Kurang dari lima perusahaan independen menyumbang ke sel ini.",
      contributor_concentration_exceeded:
        "Satu perusahaan menyumbang lebih dari seperempat baris di sel ini.",
      below_record_floor: "Kurang dari sepuluh baris masuk ke sel ini.",
    },
    open: "Buka ronde lengkap",
  },
  verify: {
    kicker: "Verifikasi",
    title: "Periksa di sini, di peramban Anda sendiri.",
    lede:
      "Dua dari tiga pemeriksaan tidak memerlukan apa pun dari kami. Peramban Anda meng-hash berkas ronde yang baru saja diunduh lalu membandingkannya dengan sidik jari yang tercatat di Solana. Kalau suatu saat operator menyajikan ronde yang berbeda, kedua angka itu akan berpisah.",
    step1: "Hitung ulang digest",
    step1Body:
      "SHA-256 atas byte persis dari ronde yang terbit, dihitung secara lokal dengan Web Crypto API.",
    step2: "Baca tambatannya",
    step2Body:
      "Digest yang sama, ditulis ke Solana devnet sebagai memo pada slot yang tertera. Publik, berpenanda waktu, dan bukan milik kami untuk disunting.",
    step3: "Buktikan tanda terima Anda ikut terhitung",
    step3Body:
      "Setiap baris yang diterima mengembalikan sebuah commitment. Tanyakan apakah commitment itu ada di ronde, dan apakah selnya sampai ke band yang terbit.",
    recompute: "Hash ronde di peramban saya",
    recomputing: "Sedang meng-hash…",
    match: "Cocok dengan digest yang ditambatkan",
    mismatch: "Tidak cocok — jangan percayai ronde ini",
    onChain: "Lihat tambatannya di Solana",
    inputLabel: "Commitment tanda terima",
    inputHint: "64 karakter heksadesimal, seperti yang dikembalikan saat baris diterima.",
    check: "Periksa tanda terima",
    tryOne: "Coba contoh",
    resultIn: "Ada di ronde, dan terhitung ke sebuah band yang terbit.",
    resultWithheld: "Ada di ronde. Selnya ditahan, jadi tidak ada band yang terbit untuknya.",
    resultNone: "Tidak ada baris di ronde ini yang membawa commitment tersebut.",
    open: "Buka alat verifikasi",
    sampleNote:
      "Pencarian tanda terima di halaman ini dijawab dari kumpulan contoh yang ikut dikirim bersama situs, jadi ia bekerja luring dan tidak menghabiskan kredit siapa pun. Jawaban yang otoritatif datang dari enclave: `npm run verify` di repositori bertanya langsung ke kontrak, lengkap dengan satu commitment palsu sebagai kontrol.",
  },
  faq: {
    kicker: "Pertanyaan",
    title: "Yang paling tidak enak dulu.",
    items: [
      {
        q: "Bisakah operator tetap membaca kiriman anggota?",
        a: "Tidak ada fungsi yang mengembalikan sebuah baris. Daftar akses peta tersegel hanya menyebut identitas kontrak, dan kontraknya mengekspos submit, agregasi, baca-ronde, dan cek-tanda-terima. Menambahkan jalur baca berarti mendaftarkan versi kontrak baru dengan identitas baru — sebuah tindakan yang terlihat, bukan yang senyap.",
      },
      {
        q: "Apa yang mencegah sebuah ronde diganti belakangan?",
        a: "Digest di Solana. Menerbitkan ulang ronde berbeda dengan pengenal yang sama menghasilkan hash berbeda, sementara memo aslinya tetap di tempatnya dengan block time aslinya. Penggantian itu tidak jadi mustahil — ia jadi kentara.",
      },
      {
        q: "Kenapa satu sel dibuang hanya karena satu penyumbang dominan?",
        a: "Karena band yang sebagian besar berasal dari satu pemberi kerja sama saja dengan memberi tahu anggota lain berapa perusahaan itu membayar. Itulah pertukaran yang hendak dicegah oleh syarat safe-harbour, dan menerbitkannya dengan catatan kaki tidak memperbaikinya.",
      },
      {
        q: "Apa yang sebenarnya diterima anggota?",
        a: "Satu tanda terima per baris yang diterima, dan band yang terbit. Tanda terima membuktikan baris itu terhitung tanpa mengungkapkannya. Tidak ada bagian dari respons yang menggambarkan data anggota lain.",
      },
      {
        q: "Apakah ini siap untuk konsorsium sungguhan?",
        a: "Pipeline-nya nyata dan gerbangnya bekerja, tetapi ia berjalan di tenant sandbox dengan kredit uji, dan ronde saat ini dieksekusi memakai identitas tenant alih-alih kunci agen yang didelegasikan. Dua hal itulah yang harus ditutup sebelum payroll siapa pun benar-benar mendekat.",
      },
    ],
  },
  cta: {
    title: "Jalankan sendiri satu ronde.",
    body: "Kontrak, agen, dan situs ini berada dalam satu repositori. Deploy, submit, agregasi, tambatkan, verifikasi — lima perintah, dan yang terakhir memberi tahu apakah empat yang pertama layak dipercaya.",
    primary: "Baca kodenya",
    secondary: "Cara menjalankannya",
  },
  footer: {
    built: "Dibangun di atas Terminal 3 · ditambatkan di Solana devnet",
    disclaimer:
      "Data demonstrasi. Angkanya sintetis dan tidak menggambarkan pemberi kerja mana pun.",
    language: "Bahasa",
  },
  pages: {
    round: {
      title: "Ronde 2026-q1",
      lede: "Ronde lengkap yang terbit, persis seperti yang dikembalikan enclave.",
      back: "Kembali",
      totals: "Total",
      attestation: "Atestasi",
      anchor: "Tambatan",
    },
    verify: {
      title: "Verifikasi sebuah ronde",
      lede: "Hitung ulang digest-nya, bandingkan dengan ledger, lalu periksa tanda terima ke enclave.",
      back: "Kembali",
    },
    docs: {
      title: "Menjalankan dan merawat Blindband",
      lede: "Terbuat dari apa, bagaimana menjalankan satu ronde, dan apa saja yang rusak saat membangunnya.",
      back: "Kembali",
      runTitle: "Menjalankan satu ronde",
      runLede: "Lima perintah, berurutan. Masing-masing menolak lanjut bila perintah sebelumnya meninggalkan sesuatu yang tidak konsisten.",
      layoutTitle: "Susunan repositori",
      layoutLede: "Tiga bagian, dipisah agar logika yang penting bisa diuji tanpa node, tanpa enclave, dan tanpa kredit.",
      bugsTitle: "Bug dan catatan platform",
      bugsLede: "Semua di bawah ini memakan waktu nyata. Ditulis supaya orang berikutnya bisa memakai waktunya untuk hal lain.",
      bugsEnOnly:
        "Bagian ini tetap berbahasa Inggris di semua bahasa agar bisa diteruskan ke Terminal 3 persis seperti adanya — pesan galat yang diterjemahkan tidak akan cocok dengan apa pun di log mereka.",
      bugPlatform: "Platform",
      bugOurs: "Milik kami",
      bugSymptom: "Gejala",
      bugCause: "Penyebab",
      bugFix: "Perbaikan",
      bugCost: "Biaya",
      handoverTitle: "Melanjutkan atau menyerahkan",
      handoverBody:
        "Saya ingin terus menjalankan ini dan membawanya ke pilot konsorsium sungguhan. Kalau Terminal 3 lebih memilih meng-host-nya, serah terimanya ringan: repositorinya mandiri, skrip deploy-nya idempoten, dan satu-satunya state di luar git adalah DID tenant, identitas kontrak, dan daftar akses peta — semuanya tercatat di state.json dan bisa dibentuk ulang dengan satu kali deploy.",
    },
  },
};

const zh: Dictionary = {
  meta: {
    title: "Blindband — 经得起复核的薪酬基准",
    description:
      "成员提交的薪酬数据在可信执行环境内保持密封。只有通过四道反垄断安全港门槛的聚合结果才会发布，其指纹被锚定在 Solana 上，无法被悄悄改写。",
  },
  nav: {
    round: "本轮结果",
    verify: "验证",
    docs: "文档",
    source: "源码",
    skip: "跳到正文",
    themeLight: "切换到浅色主题",
    themeDark: "切换到深色主题",
  },
  hero: {
    eyebrow: "构建于 Terminal 3 的保密基准测算",
    title: "经得起复核的",
    titleAccent: "薪酬基准。",
    lede:
      "竞争对手不会把薪酬表发给彼此，法务也不会允许。Blindband 把密封的数据行送进飞地，只有通过四道安全港门槛的分位区间才会发布，并把结果的指纹写入公开账本。你不必相信运营方，你可以自己把那个数字重新算一遍。",
    primary: "查看本轮结果",
    secondary: "核对回执",
    stats: {
      published: "个已发布区间",
      withheld: "个被扣下的单元",
      contributors: "家参与企业",
      rows: "行密封数据",
    },
    proof: {
      label: "飞地返回的结果",
      median: "中位数",
      withheld: "已扣下",
      digest: "本轮指纹",
      anchored: "已锚定于 Solana devnet",
    },
  },
  problem: {
    kicker: "问题所在",
    title: "每一份薪酬调研，都要你把薪酬表交给一个陌生人。",
    body:
      "通常的做法是找供应商：各家企业寄出表格，供应商承诺保密，几个月后返回一份 PDF。企业看不到中间发生了什么，监管者同样看不到。而真正要紧的那条规则——基准不得成为竞争对手互相窥探当期薪酬的渠道——所依靠的只是一句保证。",
    aside:
      "反垄断机构对此说得很明白。竞争者之间的信息交换要站得住脚，需要中立方完成聚合、数据具备历史性、有足够多的独立企业参与，且没有任何一家企业主导结果。这四个条件就是本系统设计的全部依据。",
  },
  how: {
    kicker: "运行方式",
    title: "三个步骤，其中只有一步需要信任。",
    steps: [
      {
        kicker: "01",
        title: "数据密封进入",
        body:
          "每位成员把数据行提交给运行在可信执行环境中的合约。数据落入一个私有键值映射，只有合约自身的身份才能读取。不存在能打开它的运营控制台，因为根本没有把它返回出来的代码路径。",
      },
      {
        kicker: "02",
        title: "飞地决定什么可以被说出口",
        body:
          "聚合在无人能旁观的地方运行。每个单元都要接受四道门槛的检验。通过的单元以分位区间发布；未通过的单元会被点名并给出原因，而它的数值永远不会被输出——既不给成员，也不给运营方。",
      },
      {
        kicker: "03",
        title: "结果被钉在公开处",
        body:
          "已发布的一轮会被哈希，摘要被绑定进交易回执，同一摘要以 memo 形式写入 Solana。这让该轮结果获得独立的时间戳与只增不改的历史，事后无法被替换成更好看的版本。",
      },
    ],
    caption:
      "该合约申请三项宿主能力：键值存储、日志与租户上下文。它不申请出站 HTTP，因此没有需要审查的外发面。",
  },
  gates: {
    kicker: "规则集",
    title: "四道门槛，在任何数据离开飞地之前生效。",
    lede:
      "它们不是可随手调节的旋钮，而是编译进合约、并写在已发布轮次里的常量，成员因此能看清自己读到的数字出自哪一套规则。",
    items: [
      {
        name: "中立聚合方",
        rule: "没有成员能看到别人的数据行",
        body: "聚合在飞地内运行，密封映射的访问范围仅限合约身份。成员拿到的是区间，不是数据行。",
      },
      {
        name: "历史数据",
        rule: "生效日期至少满 91 天",
        body:
          "更近期的数据会被剔除出本轮，并计入统计。当期薪酬正是竞争者不得交换的那个数字，陈旧薪酬才是可以的那个。",
      },
      {
        name: "参与方下限",
        rule: "每个单元至少 5 家企业、10 行数据",
        body: "低于此线，区间描述的就是个人而非市场。该单元会被标记为扣下，其统计量随即丢弃。",
      },
      {
        name: "集中度上限",
        rule: "单一企业占比不得超过 25%",
        body: "主要来自一家雇主的区间，不过是那家雇主的薪酬表披上了市场的外衣。超过上限，单元即被扣下。",
      },
    ],
    note:
      "Blindband 是工程实现，不是法律意见。门槛依据公开的安全港指引；是否适用于某个具体联盟，应由该联盟的法律顾问判断。",
  },
  round: {
    kicker: "本轮结果",
    title: "飞地发布了什么，又拒绝发布了什么。",
    lede:
      "以下内容全部来自 Terminal 3 沙箱上的一次真实合约执行，并锚定于 Solana devnet。本页没有任何示意性内容。",
    tableRole: "岗位与级别",
    tableSpread: "P10 · 中位数 · P90",
    tableContributors: "企业数",
    tableRecords: "行数",
    tableShare: "最大占比",
    withheldTitle: "已扣下",
    withheldLede:
      "这些单元是有数据的。飞地算出了结果，然后拒绝发布——而这恰恰是整套系统真正的价值所在。",
    reasons: {
      below_contributor_floor: "参与该单元的独立企业不足五家。",
      contributor_concentration_exceeded: "单一企业占该单元数据行的四分之一以上。",
      below_record_floor: "落入该单元的数据不足十行。",
    },
    open: "查看完整轮次",
  },
  verify: {
    kicker: "验证",
    title: "就在你自己的浏览器里核对。",
    lede:
      "三项检查中有两项完全不需要我们参与。你的浏览器会对刚下载的轮次文件做哈希，再与记录在 Solana 上的指纹比对。若运营方哪天给你的是另一份轮次，这两个数字就会分道扬镳。",
    step1: "重新计算摘要",
    step1Body: "对已发布轮次的原始字节做 SHA-256，由 Web Crypto API 在本地完成。",
    step2: "读取链上锚点",
    step2Body: "同一个摘要，在所示 slot 以 memo 写入 Solana devnet。公开、有时间戳，且不由我们编辑。",
    step3: "证明回执确实计入",
    step3Body: "每一行被接受的数据都会返回一个 commitment。你可以查询它是否在本轮中，以及其单元是否进入了已发布区间。",
    recompute: "在我的浏览器里哈希本轮",
    recomputing: "正在哈希…",
    match: "与链上锚定的摘要一致",
    mismatch: "不一致——请勿信任本轮结果",
    onChain: "在 Solana 上查看锚点",
    inputLabel: "回执 commitment",
    inputHint: "64 位十六进制字符，即数据行被接受时返回的值。",
    check: "核对回执",
    tryOne: "试用示例",
    resultIn: "在本轮中，且已计入一个已发布区间。",
    resultWithheld: "在本轮中。其单元被扣下，因此没有为它发布区间。",
    resultNone: "本轮中没有任何数据行带有该 commitment。",
    open: "打开验证工具",
    sampleNote:
      "本页的回执查询取自随站点一同发布的示例集合，因此可离线工作，也不消耗任何人的额度。权威答案来自飞地：仓库中的 `npm run verify` 会直接询问合约，并附带一个故意伪造的 commitment 作为对照。",
  },
  faq: {
    kicker: "问答",
    title: "先说最难堪的那几个。",
    items: [
      {
        q: "运营方难道不能照样读到提交内容？",
        a: "不存在返回单行数据的函数。密封映射的访问列表只写了合约身份，而合约对外暴露的是提交、聚合、读取轮次与核对回执。要加一条读取路径，就得以新身份注册新的合约版本——那是看得见的动作，不是悄悄的。",
      },
      {
        q: "凭什么保证轮次事后不被替换？",
        a: "靠 Solana 上的摘要。用同一标识重新发布另一份轮次会得到不同的哈希，而原来的 memo 连同其原始出块时间仍在原处。替换并非变得不可能，而是变得显而易见。",
      },
      {
        q: "为何因为一家企业占比过高，就丢掉整个单元？",
        a: "因为主要来自一家雇主的区间，等于告诉其他成员那家雇主付多少钱。安全港条件存在的意义正是阻止这种交换，加一条脚注再发布并不能解决问题。",
      },
      {
        q: "成员实际拿回什么？",
        a: "每行被接受的数据对应一份回执，以及已发布的区间。回执能证明该行被计入，却不泄露其内容。响应中没有任何部分描述其他成员的数据。",
      },
      {
        q: "它可以用于真实联盟了吗？",
        a: "流水线是真的，门槛也确实生效，但它跑在沙箱租户上、使用测试额度，且当前轮次以租户身份而非受委派的代理密钥执行。这两点必须先补上，任何人的真实薪酬数据才谈得上接近它。",
      },
    ],
  },
  cta: {
    title: "自己跑一轮试试。",
    body: "合约、代理与本站点同属一个仓库。部署、提交、聚合、锚定、验证——五条命令，最后一条会告诉你前四条是否值得相信。",
    primary: "阅读源码",
    secondary: "运行方法",
  },
  footer: {
    built: "构建于 Terminal 3 · 锚定于 Solana devnet",
    disclaimer: "演示数据。所有数字均为合成，不对应任何真实雇主。",
    language: "语言",
  },
  pages: {
    round: {
      title: "轮次 2026-q1",
      lede: "完整的已发布轮次，与飞地返回的内容完全一致。",
      back: "返回",
      totals: "统计",
      attestation: "证明",
      anchor: "锚点",
    },
    verify: {
      title: "验证一个轮次",
      lede: "重算摘要、与账本比对，再向飞地核对一份回执。",
      back: "返回",
    },
    docs: {
      title: "运行与维护 Blindband",
      lede: "它由什么构成、如何跑一轮，以及构建过程中出过什么问题。",
      back: "返回",
      runTitle: "跑一轮",
      runLede: "五条命令，按顺序执行。只要上一条留下了不一致的状态，下一条就会拒绝继续。",
      layoutTitle: "仓库结构",
      layoutLede: "三个部分，这样切分是为了让核心逻辑无需节点、飞地或额度即可测试。",
      bugsTitle: "缺陷与平台记录",
      bugsLede: "下面每一条都实打实地耗掉了时间。写下来，是为了让下一个人把时间花在别处。",
      bugsEnOnly:
        "无论页面语言为何，这部分一律保留英文，以便原样转交给 Terminal 3——翻译过的错误信息在他们的日志里检索不到任何东西。",
      bugPlatform: "平台",
      bugOurs: "我们自己",
      bugSymptom: "现象",
      bugCause: "成因",
      bugFix: "修复",
      bugCost: "代价",
      handoverTitle: "继续运营或移交",
      handoverBody:
        "我希望继续运营它，并推进到真实的联盟试点。如果 Terminal 3 更愿意自行托管，移交成本很低：仓库自成一体，部署脚本幂等，git 之外的状态只有租户 DID、合约身份和映射访问列表——它们都记录在 state.json 中，一次部署即可重建。",
    },
  },
};

const DICTIONARIES: Record<Locale, Dictionary> = { en, id, zh };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
