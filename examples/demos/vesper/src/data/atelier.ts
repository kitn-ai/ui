import type { Material, TimelineEntry } from './types';

/**
 * Three stages, not three cloths. The photographs are a dress form, a
 * hand-finished collar and a rail of past seasons -- so the copy is about
 * where a piece is made, which is what those frames actually show. Naming
 * them "wool / silk / leather" over pictures of mannequins was the mismatch.
 */
export const materials: Material[] = [
  {
    id: 'fitting',
    name: 'The Fitting Room',
    origin: 'Stage one',
    copy: 'Every pattern is cut on a form before it is cut on a person. A coat sits on the stand for a week while the shoulder is moved a few millimetres at a time. Most of the work you are paying for happens here, and none of it is visible in the finished piece.',
    image: '/img/atelier/wool.jpg',
  },
  {
    id: 'finish',
    name: 'The Finish',
    origin: 'Stage two',
    copy: 'Collars, facings and every edge that will be seen are finished by hand. It is slower by a day per garment and it is the difference between cloth that holds a shape and cloth that merely covers.',
    image: '/img/atelier/silk.jpg',
  },
  {
    id: 'archive',
    name: 'The Archive',
    origin: 'Stage three',
    copy: 'One of everything we have made stays on a rail in the back room. New patterns are cut against old ones, which is why the shoulder line has not changed since 2021 and why it will not change next season either.',
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
    body: 'Eleven people in one room in northern Italy. Every piece is made start to finish by one of them, and their initials are inside the pocket bag.',
  },
  {
    year: '2026',
    title: 'Studies in Monochrome',
    body: 'The autumn collection: quiet tailoring, soft volume, no colour at all. Shot in natural light over three days in Lisbon.',
  },
];
