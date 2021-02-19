export function getPrismaModelForList(prisma: any, listKey: string) {
  return prisma[listKey[0].toLowerCase() + listKey.slice(1)];
}
