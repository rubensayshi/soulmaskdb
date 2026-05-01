package api

import (
	"encoding/json"
	"net/http"

	dbgen "github.com/rubensayshi/soulmask-codex/backend/internal/db/gen"
)

type TraitResponse struct {
	ID                 string      `json:"id"`
	Star               int64       `json:"star"`
	NameZh             *string     `json:"name_zh"`
	NameEn             *string     `json:"name_en"`
	DescriptionZh      *string     `json:"description_zh"`
	DescriptionEn      *string     `json:"description_en"`
	DescriptionVagueZh *string     `json:"description_vague_zh"`
	Source             *string     `json:"source"`
	Effect             *string     `json:"effect"`
	EffectAttr         *string     `json:"effect_attr"`
	EffectValue        *float64    `json:"effect_value"`
	EffectIsPercentage bool        `json:"effect_is_percentage"`
	EffectProbability  *float64    `json:"effect_probability"`
	EffectCooldown     *float64    `json:"effect_cooldown"`
	LearnedID          *string     `json:"learned_id"`
	UpgradeID          *string     `json:"upgrade_id"`
	BaseWeight         *int64      `json:"base_weight"`
	IsDlc              bool        `json:"is_dlc"`
	IsNegative         bool        `json:"is_negative"`
	Proficiencies      interface{} `json:"proficiencies"`
	Conditions         interface{} `json:"conditions"`
	Weapons            interface{} `json:"weapons"`
}

func (s *Server) handleTraits(w http.ResponseWriter, r *http.Request) {
	rows, err := dbgen.New(s.DB).ListTraits(r.Context())
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	out := make([]TraitResponse, 0, len(rows))
	for _, row := range rows {
		t := TraitResponse{
			ID:                 row.ID,
			Star:               row.Star,
			NameZh:             nullStr(row.NameZh),
			NameEn:             nullStr(row.NameEn),
			DescriptionZh:      nullStr(row.DescriptionZh),
			DescriptionEn:      nullStr(row.DescriptionEn),
			DescriptionVagueZh: nullStr(row.DescriptionVagueZh),
			Source:             nullStr(row.Source),
			Effect:             nullStr(row.Effect),
			EffectAttr:         nullStr(row.EffectAttr),
			EffectValue:        nullFloat(row.EffectValue),
			EffectIsPercentage: row.EffectIsPercentage.Valid && row.EffectIsPercentage.Int64 != 0,
			EffectProbability:  nullFloat(row.EffectProbability),
			EffectCooldown:     nullFloat(row.EffectCooldown),
			LearnedID:          nullStr(row.LearnedID),
			UpgradeID:          nullStr(row.UpgradeID),
			BaseWeight:         nullInt(row.BaseWeight),
			IsDlc:              row.IsDlc != 0,
			IsNegative:         row.IsNegative != 0,
		}
		if row.ProficienciesJson.Valid {
			_ = json.Unmarshal([]byte(row.ProficienciesJson.String), &t.Proficiencies)
		}
		if row.ConditionsJson.Valid {
			_ = json.Unmarshal([]byte(row.ConditionsJson.String), &t.Conditions)
		}
		if row.WeaponsJson.Valid {
			_ = json.Unmarshal([]byte(row.WeaponsJson.String), &t.Weapons)
		}
		out = append(out, t)
	}
	writeJSON(w, out)
}
