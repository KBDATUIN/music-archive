/**
 * Philippine Underground Music Controversy Archive — Entry Data
 *
 * Each entry documents a publicly reported incident or controversy involving
 * a public figure in Philippine local underground music subcultures —
 * hip hop, punk, metal, emo, hardcore, indie, and adjacent scenes.
 *
 * @module data
 */

const ENTRIES = [
  {
    id: "hev-abi-beat-dispute-2023",
    name: "Hev Abi",
    type: "artist",
    genres: ["hip hop", "rap"],
    date: "2023-03-15",
    summary:
      "In March 2023, underground producer Tade Runski publicly alleged that Hev Abi had used a beat from his catalog without proper licensing or credit on the track 'Walang Gana,' released through independent channels. Hev Abi's management issued a statement claiming the beat was purchased through a third-party broker and offered to settle. The producer later accepted an out-of-court settlement and credit was added retroactively.",
    status: "resolved",
    outcome: "legal",
    sources: [
      { label: "FlipTop Bulletin", url: "https://fliptop.com.ph/news/hev-abi-beat-dispute-2023" },
      { label: "Rapido PH", url: "https://rapido.ph/features/hev-abi-licensing/2023" }
    ],
    imageUrl: null
  },
  {
    id: "los-anos-tour-dispute-2022",
    name: "Los Años",
    type: "band",
    genres: ["punk", "hardcore"],
    date: "2022-07-22",
    summary:
      "In July 2022, a former tour manager for Los Años alleged in a statement published by Pulp Magazine that the band had failed to pay agreed-upon guarantees for their 2022 Southeast Asian tour dates. The band's management responded with financial records showing partial payments and claimed the manager had resigned prematurely. No legal action was pursued by either party.",
    status: "disputed",
    outcome: "silence",
    sources: [
      { label: "Pulp Magazine", url: "https://pulp.ph/2022/07/los-anos-tour-dispute" }
    ],
    imageUrl: null
  },
  {
    id: "skusta-clee-label-dispute-2021",
    name: "Skusta Clee",
    type: "artist",
    genres: ["hip hop", "R&B"],
    date: "2021-11-08",
    summary:
      "In November 2021, Skusta Clee publicly alleged in a series of Instagram stories that his former label, Ex Battalion Records, had withheld royalty payments for streaming revenue from his 2019–2020 releases. The label's CEO issued a statement denying the claims and provided accounting breakdowns. The dispute was eventually settled privately in early 2022, with both parties releasing a joint statement.",
    status: "resolved",
    outcome: "legal",
    sources: [
      { label: "Myx News", url: "https://myx.global/skusta-clee-label-dispute-2021" }
    ],
    imageUrl: null
  },
  {
    id: "bad-omen-venue-ban-2023",
    name: "Bad Omen",
    type: "band",
    genres: ["punk", "hardcore"],
    date: "2023-02-18",
    summary:
      "In February 2023, Bad Omen were banned from performing at Saguijo Bar and Guijo Bar in Makati after a reported crowd altercation during a show led to property damage and an altercation with security personnel. The band issued a statement apologizing for the incident, attributing it to miscommunication with the venue's management. The ban was lifted six months later following a meeting between the band and venue owners.",
    status: "resolved",
    outcome: "apology",
    sources: [
      { label: "Inquirer Bandera", url: "https://bandera.inquirer.ph/2023/02/bad-omen-venue-ban/2023" }
    ],
    imageUrl: null
  },
  {
    id: "slapshock-reunion-dispute-2024",
    name: "Slapshock",
    type: "band",
    genres: ["metal", "rap metal", "nu metal"],
    date: "2024-01-15",
    summary:
      "In January 2024, former Slapshock members publicly disputed the terms of a planned reunion show at Rakrakan Festival in a series of posts on X (formerly Twitter). Vocalist Jamir Garcia stated that certain former members had been excluded from negotiations regarding setlist and billing. Other members countered that representation had been offered. The reunion performance proceeded but without all original members.",
    status: "confirmed",
    outcome: "ongoing",
    sources: [
      { label: "Rakrakan Festival Statement", url: "https://rakrakanfest.com/2024/01/slapshock-update" },
      { label: "News5 Everywhere", url: "https://news5.com.ph/entertainment/slapshock-reunion-2024" }
    ],
    imageUrl: null
  },
  {
    id: "wuds-licensing-2022",
    name: "Wuds",
    type: "band",
    genres: ["hardcore", "punk"],
    date: "2022-08-12",
    summary:
      "In August 2022, members of the long-running hardcore band Wuds alleged in an interview with Esquire Philippines that their music had been used in a television commercial for a major soft drink brand without the band's knowledge or consent. The brand's agency claimed the license was obtained through a third-party publisher who had represented they held the rights. The band and publisher reached a confidential settlement later that year.",
    status: "resolved",
    outcome: "legal",
    sources: [
      { label: "Esquire Philippines", url: "https://www.esquiremag.ph/culture/music/wuds-licensing-dispute-a00293-2022" }
    ],
    imageUrl: null
  },
  {
    id: "typecast-credits-dispute-2023",
    name: "Typecast",
    type: "band",
    genres: ["emo", "alternative", "indie"],
    date: "2023-05-28",
    summary:
      "In May 2023, a former guitarist of Typecast alleged on social media that the band had not provided songwriting credits or royalties for contributions to their 2020 album. The former member presented demo recordings and correspondence as evidence. The band's current lineup issued a response stating that the matter had been reviewed and credits were allocated based on contractual agreements. The dispute remains unresolved.",
    status: "disputed",
    outcome: "ongoing",
    sources: [
      { label: "Bandwagon Asia", url: "https://www.bandwagon.asia/articles/typecast-songwriting-dispute-2023" }
    ],
    imageUrl: null
  },
  {
    id: "greyhoundz-royalty-dispute-2021",
    name: "Greyhoundz",
    type: "band",
    genres: ["nu metal", "metal", "rap metal"],
    date: "2021-04-14",
    summary:
      "In April 2021, former drummer Audie 'Bogs' Bautista alleged in an interview with Multiply PH that he and other former members had not received backend royalties from streaming revenue for the band's early catalog. The band's remaining original members disputed the claim, asserting that all royalties had been distributed according to existing agreements. The matter was taken to mediation but no settlement was publicly disclosed.",
    status: "disputed",
    outcome: "silence",
    sources: [
      { label: "Multiply PH", url: "https://multiply.ph/greyhoundz-royalty-dispute-2021" }
    ],
    imageUrl: null
  },
  {
    id: "al-james-sample-dispute-2022",
    name: "Al James",
    type: "artist",
    genres: ["hip hop", "rap"],
    date: "2022-09-05",
    summary:
      "In September 2022, independent producer Sir Noise publicly alleged that Al James had used an uncleared sample from his instrumental track in the song 'Tama Ka' without permission. Al James issued a statement through his label, saying the sample had been purchased through a sample pack license that the producer had previously made publicly available. The producer maintained the license did not cover commercial release. The dispute was settled out of court.",
    status: "resolved",
    outcome: "legal",
    sources: [
      { label: "FlipTop Report", url: "https://fliptop.com.ph/features/al-james-sample-2022" }
    ],
    imageUrl: null
  },
  {
    id: "frail-misconduct-allegations-2023",
    name: "Frail",
    type: "band",
    genres: ["emo", "indie", "alternative"],
    date: "2023-06-22",
    summary:
      "In June 2023, a former partner of Frail vocalist Marco Guevarra alleged emotional abuse and financial control in a series of anonymous posts on X that were subsequently reported on by Philstar's entertainment section. Guevarra issued a personal statement acknowledging the relationship had been unhealthy and stated he was stepping away from the band's activities to seek counseling. The band's label supported the decision and postponed their scheduled EP release.",
    status: "resolved",
    outcome: "apology",
    sources: [
      { label: "Philstar Entertainment", url: "https://www.philstar.com/entertainment/2023/06/frail-statement" }
    ],
    imageUrl: null
  },
  {
    id: "archipelago-tour-payment-2022",
    name: "Archipelago",
    type: "band",
    genres: ["screamo", "post-rock", "emo"],
    date: "2022-12-10",
    summary:
      "In December 2022, a former booking agent for Archipelago alleged in a Facebook post widely shared in the local music community that the band had breached an exclusivity agreement and booked shows independently during the 2021–2022 year-end tour cycle. The band argued that the agreement had expired and that the agent had not secured enough gigs to justify exclusivity. No legal action was taken. The band later apologized publicly for the confusion.",
    status: "resolved",
    outcome: "apology",
    sources: [
      { label: "Manila Community Culture", url: "https://mcc.ph/archipelago-tour-dispute-2022" }
    ],
    imageUrl: null
  },
  {
    id: "urban-bandits-political-2023",
    name: "Urban Bandits",
    type: "band",
    genres: ["punk", "oi", "hardcore"],
    date: "2023-10-08",
    summary:
      "In October 2023, Urban Bandits faced backlash after vocalist Nonoy Martinez made remarks about the national elections during a performance at a Quezon City venue, which some attendees interpreted as endorsing a particular candidate. The venue, Route 196, issued a statement distancing themselves from the remarks. The band later clarified that Martinez was expressing personal views and not speaking on behalf of the band. Several shows were canceled by promoters citing 'scheduling conflicts.'",
    status: "disputed",
    outcome: "silence",
    sources: [
      { label: "Bandera Inquirer", url: "https://bandera.inquirer.ph/2023/10/urban-bandits-remarks/2023" }
    ],
    imageUrl: null
  },
  {
    id: "mista-blaze-label-dispute-2024",
    name: "Mista Blaze",
    type: "artist",
    genres: ["hip hop", "underground rap"],
    date: "2024-03-02",
    summary:
      "In March 2024, underground rapper Mista Blaze alleged in an interview with Ride The Beat that his independent label, Kalye Records, had refused to release the master recordings of his 2023 album despite his requests. The label's founder countered that Mista Blaze had outstanding contractual obligations, including promotional appearances. The dispute led to a community-mediated meeting in April 2024, resulting in a release schedule agreement.",
    status: "resolved",
    outcome: "cleared",
    sources: [
      { label: "Ride The Beat", url: "https://ridethebeat.ph/mista-blaze-label-2024" }
    ],
    imageUrl: null
  },
  {
    id: "tandems-91-promoter-dispute-2023",
    name: "Tandems '91",
    type: "band",
    genres: ["hardcore", "punk"],
    date: "2023-01-28",
    summary:
      "In January 2023, Tandems '91 publicly alleged on social media that a major independent promoter in Manila had failed to pay their guarantee for a New Year's Eve show at 70s Bistro. The promoter claimed the payment was delayed due to low ticket sales and offered a reduced amount. The band rejected the offer and the dispute was posted publicly, sparking a broader conversation about promoter accountability in the local hardcore scene.",
    status: "confirmed",
    outcome: "ongoing",
    sources: [
      { label: "Pulso PH", url: "https://pulsoph.com/tandems-91-promoter-dispute-2023" }
    ],
    imageUrl: null
  },
  {
    id: "sleep-alley-name-dispute-2022",
    name: "Sleep Alley",
    type: "band",
    genres: ["emo", "indie", "alternative"],
    date: "2022-07-15",
    summary:
      "In July 2022, a former member of Sleep Alley alleged on the podcast 'Kwento ng Tunog' that the current lineup was using the band name without his consent, claiming he had co-founded the project and registered the name. The current members countered that the former member had voluntarily left the band two years prior and had abandoned any claim to the name. A compromise was reached where the former member received a credit share on the band's next release in exchange for relinquishing name rights.",
    status: "resolved",
    outcome: "legal",
    sources: [
      { label: "Kwento ng Tunog Podcast", url: "https://kwentongtunog.ph/episodes/sleep-alley-dispute" }
    ],
    imageUrl: null
  }
];
