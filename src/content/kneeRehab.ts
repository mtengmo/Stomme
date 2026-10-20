import { exerciseMetadata } from './exerciseMetadata';
import { exerciseList } from './exercises';

export const kneeRehabExercises = exerciseList.filter((exercise) =>
  exerciseMetadata[exercise.id].sources.some((source) =>
    source.url.includes('orthoinfo.aaos.org'),
  ),
);
export const kneeRehabSource =
  'https://www.orthoinfo.org/recovery/knee-conditioning-program/';
