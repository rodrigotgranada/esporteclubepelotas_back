export class IdolsMapperHelper {
  static mapIdol(doc: any): any {
    if (!doc) return null;
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };

    const id = obj._id?.toString() || obj.id?.toString() || '';

    return {
      _id: id,
      id,
      name: obj.name,
      nickname: obj.nickname || '',
      slug: obj.slug,
      category: obj.category,
      photoUrl: obj.photoUrl || '',
      gallery: obj.gallery || [],
      startYear: obj.startYear,
      endYear: obj.endYear ?? null,
      isActiveInClub: Boolean(obj.isActiveInClub),
      birthDate: obj.birthDate ? new Date(obj.birthDate).toISOString() : null,
      deathDate: obj.deathDate ? new Date(obj.deathDate).toISOString() : null,
      birthPlace: obj.birthPlace || '',
      quote: obj.quote || '',
      biography: obj.biography || '',
      playerStats: obj.playerStats
        ? {
            position: obj.playerStats.position || '',
            preferredFoot: obj.playerStats.preferredFoot || '',
            historicJerseyNumber: obj.playerStats.historicJerseyNumber ?? null,
            matchesCount: obj.playerStats.matchesCount ?? 0,
            goalsCount: obj.playerStats.goalsCount ?? 0,
            titles: obj.playerStats.titles || [],
            memorableMatch: obj.playerStats.memorableMatch || '',
          }
        : null,
      coachStats: obj.coachStats
        ? {
            matchesCount: obj.coachStats.matchesCount ?? 0,
            winsCount: obj.coachStats.winsCount ?? 0,
            drawsCount: obj.coachStats.drawsCount ?? 0,
            lossesCount: obj.coachStats.lossesCount ?? 0,
            titles: obj.coachStats.titles || [],
            tacticalStyle: obj.coachStats.tacticalStyle || '',
          }
        : null,
      staffStats: obj.staffStats
        ? {
            roleName: obj.staffStats.roleName || '',
            yearsOfDedication: obj.staffStats.yearsOfDedication || '',
            backstageStory: obj.staffStats.backstageStory || '',
          }
        : null,
      fanStats: obj.fanStats
        ? {
            stadiumSector: obj.fanStats.stadiumSector || '',
            trademark: obj.fanStats.trademark || '',
          }
        : null,
      isFeatured: Boolean(obj.isFeatured),
      order: obj.order ?? 0,
      isActive: Boolean(obj.isActive),
      createdBy: obj.createdBy
        ? {
            _id: obj.createdBy._id?.toString() || obj.createdBy.toString(),
            name: obj.createdBy.firstName
              ? `${obj.createdBy.firstName} ${obj.createdBy.lastName || ''}`.trim()
              : 'Admin',
          }
        : null,
      lastEditedBy: obj.lastEditedBy
        ? {
            _id: obj.lastEditedBy._id?.toString() || obj.lastEditedBy.toString(),
            name: obj.lastEditedBy.firstName
              ? `${obj.lastEditedBy.firstName} ${obj.lastEditedBy.lastName || ''}`.trim()
              : 'Admin',
          }
        : null,
      createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: obj.updatedAt ? new Date(obj.updatedAt).toISOString() : new Date().toISOString(),
    };
  }
}
