/**
 * Financial calculation helper functions.
 */

export interface InstallmentOption {
  numero: number;
  valorParcela: number;
  valorTotal: number;
  jurosTotal: number;
  taxaEfetivaTotal: number;
}

export type TipoJuros = 'composto' | 'simples';

/**
 * Formats a number as BRL currency (R$)
 */
export const formatBRL = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Calculates installment list from 1x to 12x
 */
export const calcularParcelas = (
  valorTotal: number,
  temJuros: boolean,
  taxaMensal: number | Record<number, number>,
  tipoJuros: TipoJuros = 'composto'
): InstallmentOption[] => {
  const result: InstallmentOption[] = [];

  const parcelasArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18];
  for (const n of parcelasArray) {
    const taxaDaParcela = typeof taxaMensal === 'number' ? taxaMensal : (taxaMensal[n] ?? 0);

    if (!temJuros || taxaDaParcela <= 0) {
      result.push({
        numero: n,
        valorParcela: valorTotal / n,
        valorTotal: valorTotal,
        jurosTotal: 0,
        taxaEfetivaTotal: 0,
      });
      continue;
    }

    const i = taxaDaParcela / 100;
    let valorParcela = 0;
    let totalPago = 0;

    if (tipoJuros === 'composto') {
      // Price Table Formula (Compound Interest)
      // PMT = PV * [i * (1+i)^n] / [(1+i)^n - 1]
      const pow = Math.pow(1 + i, n);
      valorParcela = valorTotal * ((i * pow) / (pow - 1));
      totalPago = valorParcela * n;
    } else {
      // Simple Interest Formula
      // Total = PV * (1 + i * n)
      totalPago = valorTotal * (1 + i * n);
      valorParcela = totalPago / n;
    }

    // Guard against floating point NaN or Infinity
    if (isNaN(valorParcela) || !isFinite(valorParcela)) {
      valorParcela = valorTotal / n;
      totalPago = valorTotal;
    }

    const jurosTotal = Math.max(0, totalPago - valorTotal);
    const taxaEfetivaTotal = (jurosTotal / valorTotal) * 100;

    result.push({
      numero: n,
      valorParcela,
      valorTotal: totalPago,
      jurosTotal,
      taxaEfetivaTotal,
    });
  }

  return result;
};
