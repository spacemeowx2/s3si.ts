const SOURCE = `
kuma_slosher 	23900, grizzco_slosher 	熊先生印章泼桶 	Bär-Schwapper 	Grizzco Slosher 	Grizzco Slosher 	Derramatic Don Oso 	Derramatic Don Oso 	Seau M. Ours SA 	Seau M. Ours Cie 	Secchiostro Ursus 	Beer & Co-morser 	Ведроган «Потапыч Inc.» 	クマサン印のスロッシャー 	熊先生商會潑桶 	Grizzco Slosher
kuma_blaster 	20900, grizzco_blaster 	熊先生印章爆破枪 	Bär-Blaster 	Grizzco Blaster 	Grizzco Blaster 	Devastador Don Oso 	Lanzamotas Don Oso 	Blaster M. Ours SA 	Blasteur M. Ours Cie 	Blaster Ursus 	Beer & Co-blaster 	Бластер «Потапыч Inc.» 	クマサン印のブラスター 	熊先生商會爆破槍 	Mr. 베어표 블래스터
kuma_stringer 	27900, grizzco_stringer 	熊先生印章猎鱼弓 	Bär-Stringer 	Grizzco Stringer 	Grizzco Stringer 	Arcromatizador Don Oso 	Arcromatizador Don Oso 	Transperceur M. Ours SA 	Transperceur M. Ours Cie 	Calamarco Ursus 	Beer & Co-spanner 	Тетиватор «Потапыч Inc.» 	クマサン印のストリンガー 	熊先生商會獵魚弓 	Mr. 베어표 스트링거
kuma_charger 	22900, grizzco_charger 	熊先生印章蓄力狙击枪 	Bär-Konzentrator 	Grizzco Charger 	Grizzco Charger 	Cargatintas Don Oso 	Cargatintas Don Oso 	Fusil M. Ours SA 	Fusil M. Ours Cie 	Splatter Ursus 	Beer & Co-lader 	Сплатган «Потапыч Inc.» 	クマサン印のチャージャー 	熊先生商會蓄力狙擊槍 	Grizzco Charger
kuma_shelter 	26900, grizzco_brella 	熊先生印章防空伞 	Bär-Pluviator 	Grizzco Brella 	Grizzco Brella 	Paratintas Don Oso 	Paratintas Don Oso 	Para-encre M. Ours SA 	Para-encre M. Ours Cie 	Sparasole Ursus 	Beer & Co-plenzer 	Зонтган «Потапыч Inc.» 	クマサン印のシェルター 	熊先生商會防空傘 	Mr. 베어표 셸터
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
