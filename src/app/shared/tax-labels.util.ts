export interface TaxLabels {
  /** Form keys of the two tax fields: India PAN/GST, everyone else VAT/TIN */
  field1Key: 'property_pan' | 'property_vat';
  field2Key: 'property_gst' | 'property_tin';
  title: string;
  field1Label: string;
  field2Label: string;
}

/**
 * Tax section for a property's country (and state, for Spain's Canary Islands).
 * Shared by the Property Details tab and the first registration popup so both show the same.
 */
export function taxLabelsFor(country: string, state?: string | null): TaxLabels {
  if (country === 'India') {
    return {
      field1Key: 'property_pan',
      field2Key: 'property_gst',
      title: 'PAN & GST Details',
      field1Label: 'PAN Number',
      field2Label: 'GST'
    };
  }
  const labels: TaxLabels = {
    field1Key: 'property_vat',
    field2Key: 'property_tin',
    title: 'VAT & TIN Details',
    field1Label: 'VAT Number',
    field2Label: 'Tax Identification Number (TIN)'
  };
  switch (country) {
    case 'Spain':
      labels.field2Label = 'Tax ID (NIF / NIE)';
      if (state === 'Canary Islands') {
        labels.title = 'IGIC & Tax ID Details';
        labels.field1Label = 'IGIC Number';
      } else {
        labels.title = 'VAT & Tax ID Details';
        labels.field1Label = 'VAT Number (IVA)';
      }
      break;
    case 'Switzerland':
      labels.title = 'VAT & Business ID Details';
      labels.field1Label = 'VAT Number (MWST/TVA/IVA)';
      labels.field2Label = 'Business ID (UID)';
      break;
    case 'Germany':
      labels.title = 'VAT & Tax Number Details';
      labels.field1Label = 'VAT Number (USt-IdNr.)';
      labels.field2Label = 'Tax Number (Steuernummer)';
      break;
    case 'Austria':
      labels.title = 'VAT & Tax Number Details';
      labels.field1Label = 'VAT Number (UID)';
      labels.field2Label = 'Tax Number (Steuernummer)';
      break;
    case 'Poland':
      labels.title = 'VAT & Tax ID Details';
      labels.field1Label = 'VAT Number (NIP)';
      labels.field2Label = 'Tax ID (NIP / PESEL)';
      break;
    case 'Romania':
      labels.title = 'VAT & Tax ID Details';
      labels.field1Label = 'VAT Number (CIF)';
      labels.field2Label = 'Tax ID (CIF / CNP)';
      break;
    case 'United Kingdom':
      labels.title = 'VAT & Tax Reference Details';
      labels.field1Label = 'VAT Number';
      labels.field2Label = 'Unique Taxpayer Reference (UTR)';
      break;
  }
  return labels;
}
