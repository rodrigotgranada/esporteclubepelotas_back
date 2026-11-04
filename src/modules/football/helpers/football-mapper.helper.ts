export class FootballMapperHelper {
  static calculateAge(birthDate?: Date | string | null): number | null {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;

    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }

  static mapAthlete(doc: any) {
    if (!doc) return null;
    const id = doc._id ? doc._id.toString() : doc.id;

    return {
      _id: id,
      id,
      name: doc.name,
      nickname: doc.nickname || null,
      slug: doc.slug,
      photoUrl: doc.photoUrl || null,
      birthDate: doc.birthDate ? new Date(doc.birthDate).toISOString() : null,
      age: this.calculateAge(doc.birthDate),
      birthPlace: doc.birthPlace || null,
      height: doc.height || null,
      weight: doc.weight || null,
      preferredFoot: doc.preferredFoot || 'RIGHT',
      primaryPosition: doc.primaryPosition,
      secondaryPositions: doc.secondaryPositions || [],
      pastClubs: doc.pastClubs || [],
      biography: doc.biography || null,
      instagram: doc.instagram || null,
      isActive: doc.isActive !== false,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    };
  }

  static mapSquadMember(member: any) {
    if (!member) return null;

    const isPopulatedAthlete = member.athlete && typeof member.athlete === 'object' && member.athlete.name;
    const athleteData = isPopulatedAthlete ? this.mapAthlete(member.athlete) : null;
    const athleteId = isPopulatedAthlete
      ? member.athlete._id?.toString() || member.athlete.id
      : member.athlete?.toString() || member.athlete;

    return {
      athleteId,
      athlete: athleteData,
      jerseyNumber: member.jerseyNumber,
      sector: member.sector,
      role: member.role || 'STARTER',
      order: member.order || 0,
    };
  }

  static mapSquad(doc: any) {
    if (!doc) return null;
    const id = doc._id ? doc._id.toString() : doc.id;

    return {
      _id: id,
      id,
      year: doc.year,
      category: doc.category,
      seasonName: doc.seasonName,
      coachName: doc.coachName || null,
      staff: (doc.staff || []).map((s: any) => ({
        role: s.role,
        name: s.name,
      })),
      coverUrl: doc.coverUrl || null,
      isCurrent: !!doc.isCurrent,
      members: (doc.members || []).map((m: any) => this.mapSquadMember(m)),
      isActive: doc.isActive !== false,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    };
  }
}
