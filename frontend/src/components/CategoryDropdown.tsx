/**
 * Category dropdown component using MUI Autocomplete
 * Searchable dropdown for selecting categories with multi-select support
 */

import { Autocomplete, TextField, Box, Stack, Typography } from '@mui/material';
import { Category, CategoryInfo } from '../types';
import CategoryTag from './CategoryTag';

interface CategoryDropdownProps {
  categories: CategoryInfo[];
  selectedCategories: Category[];
  onSelect: (category: Category) => void;
  onRemove: (category: Category) => void;
  label?: string;
}

export default function CategoryDropdown({
  categories,
  selectedCategories,
  onSelect,
  onRemove,
  label = 'Categories',
}: CategoryDropdownProps) {
  // Filter out already selected categories from options and sort alphabetically
  const availableCategories = categories
    .filter(cat => !selectedCategories.includes(cat.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Box>
      <Typography
        variant="body2"
        fontWeight={500}
        color="text.secondary"
        sx={{ mb: 1 }}
      >
        {label}
      </Typography>

      <Autocomplete
        options={availableCategories}
        getOptionLabel={(option) => option.name}
        onChange={(_, newValue) => {
          if (newValue) {
            onSelect(newValue.name);
          }
        }}
        value={null}
        clearOnBlur
        blurOnSelect
        renderOption={(props, option) => {
          const { key, ...otherProps } = props;
          return (
            <Box
              component="li"
              key={key}
              {...otherProps}
              sx={{
                py: 1,
                px: 2,
              }}
            >
              <CategoryTag category={option.name} categoryInfo={option} />
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search or select categories..."
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
              },
            }}
          />
        )}
        noOptionsText="No categories found"
        sx={{
          '& .MuiAutocomplete-listbox': {
            maxHeight: 250,
          },
        }}
      />

      {selectedCategories.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          sx={{ mt: 1.5 }}
        >
          {selectedCategories.map((category) => {
            const catInfo = categories.find(c => c.name === category);
            return (
              <CategoryTag
                key={category}
                category={category}
                categoryInfo={catInfo}
                removable
                onRemove={() => onRemove(category)}
              />
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
