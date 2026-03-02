import { useCallback } from 'react';

export interface AmountCalculationResult {
  monto: number;
  montoInput: string;
  formula: string;
}

interface UseActionAmountStrategyConfig<TLine, TMovement, TExtra> {
  movements: TMovement[];
  getMovementId: (movement: TMovement) => number;
  getCurrentMovementId: (line: TLine) => number | undefined;
  onNoMovement: () => AmountCalculationResult;
  calculateWithMovement: (args: {
    line: TLine;
    movement: TMovement;
    movementId?: number;
    cantidadValue?: number;
    extra?: TExtra;
  }) => AmountCalculationResult;
}

interface ResolveActionAmountArgs<TLine, TExtra> {
  line: TLine;
  movementId?: number;
  cantidadValue?: number;
  extra?: TExtra;
}

export function useActionAmountStrategy<TLine, TMovement, TExtra = undefined>(
  config: UseActionAmountStrategyConfig<TLine, TMovement, TExtra>,
) {
  const {
    movements,
    getMovementId,
    getCurrentMovementId,
    onNoMovement,
    calculateWithMovement,
  } = config;

  return useCallback(
    ({
      line,
      movementId,
      cantidadValue,
      extra,
    }: ResolveActionAmountArgs<TLine, TExtra>): AmountCalculationResult => {
      const resolvedMovementId = movementId ?? getCurrentMovementId(line);
      const movement = movements.find(
        (item) => getMovementId(item) === resolvedMovementId,
      );

      if (!movement) return onNoMovement();

      return calculateWithMovement({
        line,
        movement,
        movementId,
        cantidadValue,
        extra,
      });
    },
    [
      calculateWithMovement,
      getCurrentMovementId,
      getMovementId,
      movements,
      onNoMovement,
    ],
  );
}

