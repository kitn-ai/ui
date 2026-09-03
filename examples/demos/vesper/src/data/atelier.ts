import type { Material, TimelineEntry } from './types';

export const materials: Material[] = [
  {
    id: 'wool',
    name: 'Wool',
    origin: 'Biella, Italy',
    copy: 'Double-faced, which means two cloths woven as one and joined by hand along every edge. It is why the coat has no lining and no visible seam allowance, and why it takes four times as long to make.',
    image: '/img/atelier/wool.jpg',
  },
  {
    id: 'silk',
    name: 'Silk',
    origin: 'Como, Italy',
    copy: 'Sandwashed after weaving so the surface goes matte and the drape goes heavy. Untreated silk is brighter and cheaper and reads, immediately, as the wrong thing.',
    image: '/img/atelier/silk.jpg',
  },
  {
    id: 'leather',
    name: 'Leather',
    origin: 'Tuscany, Italy',
    copy: 'Vegetable-tanned over six weeks in oak and chestnut rather than six hours in chrome. It arrives pale and stiff, and it is supposed to. The jacket you own in a year is the one you made.',
    image: '/img/atelier/leather.jpg',
  },
];

export const timeline: TimelineEntry[] = [
  {
    year: '2019',
    title: 'A room above a tailor',
    body: 'Vesper began as one pattern cutter working above a tailoring shop, making coats for people who asked. There was no collection and no season, only a waiting list.',
  },
  {
    year: '2021',
    title: 'The first cloth contract',
    body: 'A standing order with a mill in Biella, small enough that they still weave it on the original looms and large enough that they answer the phone.',
  },
  {
    year: '2023',
    title: 'Twice a year, not four',
    body: 'We moved to two collections a year against the industry drift toward six. Fewer pieces, made further ahead, cut from cloth ordered a year in advance.',
  },
  {
    year: '2025',
    title: 'The atelier',
    body: 'Eleven people in one room in northern Italy. Every coat is made start to finish by one of them, and their initials are inside the pocket bag.',
  },
  {
    year: '2026',
    title: 'Studies in Monochrome',
    body: 'The autumn collection: quiet tailoring, soft volume, no colour at all. Shot in natural light over three days in Lisbon.',
  },
];
