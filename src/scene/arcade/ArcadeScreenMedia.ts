import type { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { ArcadeGame } from "./config";

export interface ArcadeScreenMedia {
  readonly game: ArcadeGame;
  readonly offset: number;
  readonly aspectRatio: number;
  readonly videoHeight: number;
  readonly poster: Texture;
  readonly texture?: Texture;
  readonly error?: string;
  readonly video?: HTMLVideoElement;
  readonly clock?: { readonly seeks: number };
  readonly frame?: number;
}
