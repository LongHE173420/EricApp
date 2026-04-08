export type MediaAsset = {
  type: 'IMAGE' | 'VIDEO';
  url?: string;
  thumbUrl?: string;
};

export type AuthorInfo = {
  id?: string;
  name: string;
  avatar?: string;
};
