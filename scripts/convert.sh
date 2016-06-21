toJson () {
  echo "===> Generating: $1.json"
  local DIR=$1
  topojson \
    --bbox \
    --id-property none \
    -p country=NAME_0 \
    -p name=NAME_1 \
    -p adm0=ID_0 \
    -p adm1=ID_1 \
    -p CC \
    -p CCC \
    -q 1e4 \
    --filter=small \
    -o "${DIR}.json" \
    -- ${DIR}_admin_0="${DIR}/${DIR}_adm0.shp" ${DIR}_admin_1="${DIR}/${DIR}_adm1.shp"
}

mergeJson() {
  echo "===> Merging: $*"
  topojson --id-property none --allow-empty -o final.json -p -- $*
}

simplifyJson() {
  echo "===> Simplifying $1 to $2"
  topojson --id-property none --allow-empty --simplify 0.25 -o $2 -p -- $1

}

toJson BRN
toJson IDN
toJson KHM
toJson LAO
toJson MMR
toJson MYS
toJson PHL
toJson SGP
toJson THA
toJson VNM

mergeJson BRN.json IDN.json KHM.json LAO.json MMR.json MYS.json PHL.json SGP.json THA.json VNM.json

simplifyJson final.json final_s.json
