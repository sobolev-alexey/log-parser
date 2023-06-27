// Typescript supports recursive type references
export type StringOrMap = string | Map<string, StringOrMap>;
