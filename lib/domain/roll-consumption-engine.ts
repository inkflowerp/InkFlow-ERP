import { RollFeedCalculationInput, RollFeedCalculationResult } from '@/types/inventory.types'

export class RollConsumptionEngine {
  /**
   * Deterministically calculate linear roll feed, bleed margin allowance, wastage, and shortage.
   */
  static calculateRollLinearFeed(input: RollFeedCalculationInput): RollFeedCalculationResult {
    const jobW = Math.max(0, Number(input.job_width_ft) || 0)
    const jobL = Math.max(0, Number(input.job_length_ft) || 0)
    const qty = Math.max(1, Number(input.quantity) || 1)
    const rollW = Math.max(0, Number(input.roll_width_ft) || 0)
    const availableL = Math.max(
      0,
      Number(input.roll_available_length_ft ?? input.roll_current_length_ft) || 0
    )
    const bleedInches =
      input.bleed_allowance_in !== undefined
        ? Number(input.bleed_allowance_in)
        : input.bleed_allowance_inches !== undefined
        ? Number(input.bleed_allowance_inches)
        : 3 // default 3 inches
    const wastageFt = Math.max(0, Number(input.wastage_length_ft) || 0)

    const bleedFt = Math.round((bleedInches / 12) * 1000) / 1000

    const requestedOrientation = input.orientation || 'auto'

    const normalFits = jobW <= rollW + 0.001
    const rotatedFits = jobL <= rollW + 0.001

    let selectedOrientation: 'normal' | 'rotated' = 'normal'
    let fitsOnRoll = true

    if (requestedOrientation === 'normal') {
      selectedOrientation = 'normal'
      fitsOnRoll = normalFits
    } else if (requestedOrientation === 'rotated') {
      selectedOrientation = 'rotated'
      fitsOnRoll = rotatedFits
    } else {
      // Auto orientation: pick the valid orientation that minimizes linear feed or fits
      if (normalFits && rotatedFits) {
        // e.g. 3x5 on 5ft roll:
        // normal feed: width 3ft <= 5ft, linear feed is 5ft
        // rotated feed: width 5ft <= 5ft, linear feed is 3ft (saving 2ft linear roll length!)
        selectedOrientation = jobW <= jobL ? 'rotated' : 'normal'
      } else if (normalFits) {
        selectedOrientation = 'normal'
      } else if (rotatedFits) {
        selectedOrientation = 'rotated'
      } else {
        fitsOnRoll = false
        selectedOrientation = 'normal'
      }
    }

    const linearFeedPerUnit = selectedOrientation === 'normal' ? jobL : jobW
    const utilizedWidth = selectedOrientation === 'normal' ? jobW : jobL

    const jobLinearFeed = Math.round(linearFeedPerUnit * qty * 100) / 100
    const totalDeductedLength = Math.round((jobLinearFeed + bleedFt + wastageFt) * 100) / 100
    const remainingRollLength = Math.max(0, Math.round((availableL - totalDeductedLength) * 100) / 100)

    const hasShortage = totalDeductedLength > availableL + 0.001
    const shortageLength = hasShortage ? Math.round((totalDeductedLength - availableL) * 100) / 100 : 0

    const sideMarginLoss = Math.max(0, Math.round((rollW - utilizedWidth) * 100) / 100)
    const totalUtilizedArea = Math.round(jobW * jobL * qty * 100) / 100
    const totalDeductedArea = Math.round(totalDeductedLength * rollW * 100) / 100
    const wastageAreaSft = Math.round(wastageFt * rollW * 100) / 100

    return {
      orientation: selectedOrientation,
      fits_on_roll: fitsOnRoll,
      is_fit_across_width: fitsOnRoll,
      linear_feed_per_unit_ft: linearFeedPerUnit,
      job_linear_feed_ft: jobLinearFeed,
      linear_feed_ft: jobLinearFeed,
      bleed_allowance_ft: bleedFt,
      wastage_length_ft: wastageFt,
      wastage_reason: input.wastage_reason || null,
      wastage_area_sft: wastageAreaSft,
      total_deducted_length_ft: totalDeductedLength,
      total_linear_deduction_ft: totalDeductedLength,
      remaining_roll_length_ft: remainingRollLength,
      new_remaining_length_ft: remainingRollLength,
      has_shortage: hasShortage,
      is_shortage: hasShortage,
      shortage_length_ft: shortageLength,
      shortage_amount_ft: shortageLength,
      utilized_width_ft: utilizedWidth,
      side_margin_loss_ft: sideMarginLoss,
      total_utilized_area_sft: totalUtilizedArea,
      total_deducted_area_sft: totalDeductedArea,
      roll_current_length_ft: availableL,
    }
  }

  /**
   * Helper to format dimensions into readable strings (e.g. 3ft × 5ft)
   */
  static formatRollDimensions(widthFt: number, lengthFt: number): string {
    return `${widthFt}ft × ${lengthFt.toFixed(2)}ft`
  }

  /**
   * Calculates derived economic area in sqft from physical dimensions (width × length)
   */
  static calculateDerivedAreaSft(widthFt: number, lengthFt: number): number {
    return Math.round(Math.max(0, widthFt) * Math.max(0, lengthFt) * 100) / 100
  }

  /**
   * Classifies a physical roll into its operational inventory state:
   * - 'purchased_full_roll' (pristine/full purchase roll e.g. 3ft × 164ft)
   * - 'partial_active_roll' (partially consumed roll actively on floor e.g. 3ft × 143.75ft)
   * - 'remnant' (physically separated offcut or short piece e.g. 3ft × 18ft)
   * - 'depleted' (length <= 0.5ft)
   */
  static classifyRollState(
    roll: Partial<InventoryRollRecord>
  ): 'purchased_full_roll' | 'partial_active_roll' | 'remnant' | 'depleted' {
    if (!roll) return 'depleted'
    if (roll.status === 'depleted' || roll.status === 'scrapped') return 'depleted'
    if ((roll as any).is_remnant || roll.status === 'remnant') return 'remnant'

    const curLen = Number(
      roll.current_length_ft ??
        roll.remaining_length_ft ??
        (roll.remaining_area_sft ? roll.remaining_area_sft / (roll.width_ft || 1) : 0)
    )
    const initLen = Number(roll.initial_length_ft ?? roll.original_length_ft ?? 164)

    if (curLen <= 0.5) return 'depleted'
    if (curLen >= initLen - 0.05 && (Number(roll.consumed_area_sft) || 0) === 0) {
      return 'purchased_full_roll'
    }
    return 'partial_active_roll'
  }

  /**
   * Evaluates active on-floor physical rolls against a production job's linear length and width requirements.
   * Recommends eligible rolls that can fulfill the linear run without stock shortage.
   */
  static findEligibleRollsForJobRequirement(
    rolls: InventoryRollRecord[],
    requiredWidthFt: number,
    requiredLengthFt: number,
    materialId?: string
  ): {
    eligible_rolls: Array<{
      roll: InventoryRollRecord
      can_fulfill: boolean
      available_length_ft: number
      required_length_ft: number
      shortage_ft: number
      remaining_after_job_ft: number
      derived_remaining_area_sft: number
    }>
    ineligible_rolls: Array<{
      roll: InventoryRollRecord
      can_fulfill: boolean
      available_length_ft: number
      required_length_ft: number
      shortage_ft: number
      remaining_after_job_ft: number
      derived_remaining_area_sft: number
      reason: string
    }>
    recommended_roll: InventoryRollRecord | null
  } {
    const eligible_rolls: any[] = []
    const ineligible_rolls: any[] = []

    const targetRolls = (rolls || []).filter((r) => {
      if (materialId && r.material_id !== materialId) return false
      return r.status === 'mounted' || r.status === 'available' || r.status === 'in_use'
    })

    for (const roll of targetRolls) {
      const rollW = Number(roll.width_ft || 0)
      const availL = Number(
        roll.current_length_ft ??
          roll.remaining_length_ft ??
          (roll.remaining_area_sft ? roll.remaining_area_sft / (rollW || 1) : 0)
      )

      const widthFits = requiredWidthFt <= rollW + 0.001
      const lengthFits = availL >= requiredLengthFt

      if (!widthFits) {
        ineligible_rolls.push({
          roll,
          can_fulfill: false,
          available_length_ft: availL,
          required_length_ft: requiredLengthFt,
          shortage_ft: 0,
          remaining_after_job_ft: availL,
          derived_remaining_area_sft: Math.round(availL * rollW * 100) / 100,
          reason: `Width insufficient: required ${requiredWidthFt}ft but roll is ${rollW}ft wide`,
        })
      } else if (!lengthFits) {
        const shortage = Math.round((requiredLengthFt - availL) * 100) / 100
        ineligible_rolls.push({
          roll,
          can_fulfill: false,
          available_length_ft: availL,
          required_length_ft: requiredLengthFt,
          shortage_ft: shortage,
          remaining_after_job_ft: 0,
          derived_remaining_area_sft: 0,
          reason: `Length insufficient: available ${availL}ft < required ${requiredLengthFt}ft (shortage: ${shortage}ft)`,
        })
      } else {
        const remAfter = Math.round((availL - requiredLengthFt) * 100) / 100
        eligible_rolls.push({
          roll,
          can_fulfill: true,
          available_length_ft: availL,
          required_length_ft: requiredLengthFt,
          shortage_ft: 0,
          remaining_after_job_ft: remAfter,
          derived_remaining_area_sft: Math.round(remAfter * rollW * 100) / 100,
        })
      }
    }

    // Recommend the tightest fitting eligible roll to prevent fragmentation
    eligible_rolls.sort((a, b) => a.available_length_ft - b.available_length_ft)
    const recommended_roll = eligible_rolls[0]?.roll || null

    return {
      eligible_rolls,
      ineligible_rolls,
      recommended_roll,
    }
  }
}
