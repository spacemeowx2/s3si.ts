const SOURCE = `
kuma_blaster 	grizzco_blaster 	熊先生印章爆破枪 	Bär-Blaster 	Grizzco Blaster 	Grizzco Blaster 	Devastador Don Oso 	Lanzamotas Don Oso 	Blaster M. Ours SA 	Blasteur M. Ours Cie 	Blaster Ursus 	Beer & Co-blaster 	Бластер «Потапыч Inc.» 	クマサン印のブラスター 	熊先生印章爆破槍 	Mr. 베어표 블래스터
kuma_stringer 	grizzco_stringer 	熊先生印章猎鱼弓 	Bär-Stringer 	Grizzco Stringer 	Grizzco Stringer 	Arcromatizador Don Oso 	Arcromatizador Don Oso 	Transperceur M. Ours SA 	Transperceur M. Ours Cie 	Calamarco Ursus 	Beer & Co-spanner 	Тетиватор «Потапыч Inc.» 	クマサン印のストリンガー 	熊先生商會獵魚弓 	Mr. 베어표 스트링거
`;

export const KEY_DICT = new Map<string, string>();
for (const line of SOURCE.split(/\n/)) {
  const [key, ...names] = line.split(/\t/);
  for (let name of names) {
    name = name.trim();
    if (KEY_DICT.has(name) && KEY_DICT.get(name) !== key) {
      console.log(`Conflict: ${name} => ${KEY_DICT.get(name)} and ${key}`);
    }
    KEY_DICT.set(name, key);
  }
}
