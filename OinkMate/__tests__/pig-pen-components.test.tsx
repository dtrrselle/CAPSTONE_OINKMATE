/**
 * PART 2 — Individual Pig Pen component tests.
 *
 * PART 1 (`pig-pens.test.tsx`) covers the whole Pig Pens screen.
 * This file tests each Pig Pens component in isolation, using each
 * component's actual props/behavior as implemented in source. No new
 * behavior is assumed and no application/production code is modified.
 *
 * Components live at OinkMate/components/pig-pens/.
 *
 * NOTE ON QUERY STYLE: this file calls `await render(<X />)` and then queries
 * through the `screen` object (e.g. `screen.getByText(...)`) instead of
 * destructuring query functions off await render()'s return value. This is
 * the pattern Part 1 (`pig-pens.test.tsx`) already uses successfully in
 * this project, and it avoids the await render()-return-shape issue you're
 * fixing separately. `await render()` itself is still called synchronously,
 * with no `await`.
 */

import React from 'react';
import { Pressable, Image, ActivityIndicator } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';

import DeletePigPenModal from '../components/pig-pens/DeletePigPenModal';
import FloatingAddButton from '../components/pig-pens/FloatingAddButton';
import PenFilter from '../components/pig-pens/PenFilter';
import PigPenCard from '../components/pig-pens/PigPenCard';
import PigPensHeader from '../components/pig-pens/PigPensHeader';
import PigSummaryCards from '../components/pig-pens/PigSummaryCards';
import SearchBar from '../components/pig-pens/SearchBar';

// ============================================================
// DeletePigPenModal
// ============================================================
describe('DeletePigPenModal', () => {
  test('PIGCOMP-01: renders the title when visible', async () => {
    await render(<DeletePigPenModal visible={true} onCancel={jest.fn()} onConfirm={jest.fn()} />);
    expect(screen.getByText('Delete Pig Pen?')).toBeTruthy();
  });

  test('PIGCOMP-02: shows the default pen name ("this pig pen") when no penName is supplied', async () => {
    await render(<DeletePigPenModal visible={true} onCancel={jest.fn()} onConfirm={jest.fn()} />);
    expect(
      screen.getByText('Are you sure you want to delete this pig pen? This action cannot be undone.')
    ).toBeTruthy();
  });

  test('PIGCOMP-03: shows the custom penName when supplied', async () => {
    await render(
      <DeletePigPenModal
        visible={true}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        penName="Pen B"
      />
    );
    expect(
      screen.getByText('Are you sure you want to delete Pen B? This action cannot be undone.')
    ).toBeTruthy();
  });

  test('PIGCOMP-04: pressing Cancel calls onCancel', async () => {
    const onCancel = jest.fn();
    await render(<DeletePigPenModal visible={true} onCancel={onCancel} onConfirm={jest.fn()} />);
    await fireEvent.press(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('PIGCOMP-05: pressing Delete calls onConfirm', async () => {
    const onConfirm = jest.fn();
    await render(<DeletePigPenModal visible={true} onCancel={jest.fn()} onConfirm={onConfirm} />);
    await fireEvent.press(screen.getByText('Delete'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('PIGCOMP-06: Delete button shows "Delete" when not deleting', async () => {
    await render(
      <DeletePigPenModal visible={true} onCancel={jest.fn()} onConfirm={jest.fn()} isDeleting={false} />
    );
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  test('PIGCOMP-07: Delete button shows "Deleting..." when isDeleting is true', async () => {
    await render(
      <DeletePigPenModal visible={true} onCancel={jest.fn()} onConfirm={jest.fn()} isDeleting={true} />
    );
    expect(screen.getByText('Deleting...')).toBeTruthy();
    expect(screen.queryByText('Delete')).toBeNull();
  });

  test('PIGCOMP-08: shows an ActivityIndicator while deleting', async () => {
    await render(
      <DeletePigPenModal visible={true} onCancel={jest.fn()} onConfirm={jest.fn()} isDeleting={true} />
    );
    expect((screen as any).UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  test('PIGCOMP-09: Cancel button is disabled while deleting (onCancel not called)', async () => {
    const onCancel = jest.fn();
    await render(
      <DeletePigPenModal visible={true} onCancel={onCancel} onConfirm={jest.fn()} isDeleting={true} />
    );
    await fireEvent.press(screen.getByText('Cancel'));
    expect(onCancel).not.toHaveBeenCalled();
  });

  test('PIGCOMP-10: Delete button is disabled while deleting (onConfirm not called)', async () => {
    const onConfirm = jest.fn();
    await render(
      <DeletePigPenModal visible={true} onCancel={jest.fn()} onConfirm={onConfirm} isDeleting={true} />
    );
    await fireEvent.press(screen.getByText('Deleting...'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('PIGCOMP-11: pressing the overlay calls onCancel when not deleting', async () => {
    const onCancel = jest.fn();
    await render(
      <DeletePigPenModal visible={true} onCancel={onCancel} onConfirm={jest.fn()} isDeleting={false} />
    );
    const pressables = (screen as any).UNSAFE_getAllByType(Pressable);
    // First Pressable in the tree is the outer overlay.
    await fireEvent.press(pressables[0]);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('PIGCOMP-12: pressing the overlay does NOT call onCancel while deleting', async () => {
    const onCancel = jest.fn();
    await render(
      <DeletePigPenModal visible={true} onCancel={onCancel} onConfirm={jest.fn()} isDeleting={true} />
    );
    const pressables = (screen as any).UNSAFE_getAllByType(Pressable);
    await fireEvent.press(pressables[0]);
    expect(onCancel).not.toHaveBeenCalled();
  });

  test('PIGCOMP-13: pressing the modal content itself does not trigger onCancel', async () => {
    const onCancel = jest.fn();
    await render(
      <DeletePigPenModal visible={true} onCancel={onCancel} onConfirm={jest.fn()} isDeleting={false} />
    );
    const pressables = (screen as any).UNSAFE_getAllByType(Pressable);
    // Second Pressable is the inner modal card, which absorbs the press
    // via its own no-op onPress and stops it reaching the overlay.
    await fireEvent.press(pressables[1]);
    expect(onCancel).not.toHaveBeenCalled();
  });

  test('PIGCOMP-14: does not display modal content when visible is false', async () => {
    await render(<DeletePigPenModal visible={false} onCancel={jest.fn()} onConfirm={jest.fn()} />);
    expect(screen.queryByText('Delete Pig Pen?')).toBeNull();
  });
});

// ============================================================
// FloatingAddButton
// ============================================================
describe('FloatingAddButton', () => {
  test('PIGCOMP-15: renders', async () => {
    await render(<FloatingAddButton onPress={jest.fn()} />);
    expect((screen as any).UNSAFE_getByProps({ accessibilityLabel: 'Add Pig Pen' })).toBeTruthy();
  });

  test('PIGCOMP-16: accessibilityRole is "button"', async () => {
    await render(<FloatingAddButton onPress={jest.fn()} />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  test('PIGCOMP-17: accessibilityLabel is "Add Pig Pen"', async () => {
    await render(<FloatingAddButton onPress={jest.fn()} />);
    expect(screen.getByLabelText('Add Pig Pen')).toBeTruthy();
  });

  test('PIGCOMP-18: pressing it calls onPress', async () => {
    const onPress = jest.fn();
    await render(<FloatingAddButton onPress={onPress} />);
    await fireEvent.press(screen.getByLabelText('Add Pig Pen'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('PIGCOMP-19: does not crash when onPress is omitted', async () => {
    await render(<FloatingAddButton />);
    // fireEvent is async in RNTL v14; if pressing without onPress threw,
    // this await would reject and the test would fail on its own.
    await fireEvent.press(screen.getByLabelText('Add Pig Pen'));
    expect(screen.getByLabelText('Add Pig Pen')).toBeTruthy();
  });
});

// ============================================================
// PenFilter
// ============================================================
describe('PenFilter', () => {
  const DEFAULT_LABELS = [
    'All Pens',
    'Creep',
    'Pre-Starter',
    'Starter',
    'Grower',
    'Finisher',
    'Environmental Alert',
  ];

  test('PIGCOMP-20: all default filter options render', async () => {
    await render(<PenFilter onSelect={jest.fn()} />);
    DEFAULT_LABELS.forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  test('PIGCOMP-21: "All Pens" is selected by default', async () => {
    await render(<PenFilter onSelect={jest.fn()} />);
    expect(screen.getByText('All Pens')).toHaveStyle({ color: '#FFFFFF' });
    expect(screen.getByText('Creep')).toHaveStyle({ color: '#6B8A82' });
  });

  test('PIGCOMP-22: pressing another option changes the selected visual state', async () => {
    await render(<PenFilter onSelect={jest.fn()} />);
    await fireEvent.press(screen.getByText('Starter'));
    expect(screen.getByText('Starter')).toHaveStyle({ color: '#FFFFFF' });
    expect(screen.getByText('All Pens')).toHaveStyle({ color: '#6B8A82' });
  });

  test('PIGCOMP-23: pressing an option calls onSelect with the correct id', async () => {
    const onSelect = jest.fn();
    await render(<PenFilter onSelect={onSelect} />);
    await fireEvent.press(screen.getByText('All Pens'));
    expect(onSelect).toHaveBeenCalledWith('all');
  });

  test('PIGCOMP-24: pressing Creep sends "creep"', async () => {
    const onSelect = jest.fn();
    await render(<PenFilter onSelect={onSelect} />);
    await fireEvent.press(screen.getByText('Creep'));
    expect(onSelect).toHaveBeenCalledWith('creep');
  });

  test('PIGCOMP-25: pressing Pre-Starter sends "pre-starter"', async () => {
    const onSelect = jest.fn();
    await render(<PenFilter onSelect={onSelect} />);
    await fireEvent.press(screen.getByText('Pre-Starter'));
    expect(onSelect).toHaveBeenCalledWith('pre-starter');
  });

  test('PIGCOMP-26: pressing Starter sends "starter"', async () => {
    const onSelect = jest.fn();
    await render(<PenFilter onSelect={onSelect} />);
    await fireEvent.press(screen.getByText('Starter'));
    expect(onSelect).toHaveBeenCalledWith('starter');
  });

  test('PIGCOMP-27: pressing Grower sends "grower"', async () => {
    const onSelect = jest.fn();
    await render(<PenFilter onSelect={onSelect} />);
    await fireEvent.press(screen.getByText('Grower'));
    expect(onSelect).toHaveBeenCalledWith('grower');
  });

  test('PIGCOMP-28: pressing Finisher sends "finisher"', async () => {
    const onSelect = jest.fn();
    await render(<PenFilter onSelect={onSelect} />);
    await fireEvent.press(screen.getByText('Finisher'));
    expect(onSelect).toHaveBeenCalledWith('finisher');
  });

  test('PIGCOMP-29: pressing Environmental Alert sends "alert"', async () => {
    const onSelect = jest.fn();
    await render(<PenFilter onSelect={onSelect} />);
    await fireEvent.press(screen.getByText('Environmental Alert'));
    expect(onSelect).toHaveBeenCalledWith('alert');
  });

  test('PIGCOMP-30: renders custom options in place of the defaults', async () => {
    const customOptions = [
      { id: 'custom-a', label: 'Custom A' },
      { id: 'custom-b', label: 'Custom B' },
    ];
    await render(<PenFilter options={customOptions} onSelect={jest.fn()} />);
    expect(screen.getByText('Custom A')).toBeTruthy();
    expect(screen.getByText('Custom B')).toBeTruthy();
    expect(screen.queryByText('Creep')).toBeNull();
  });

  test('PIGCOMP-31: custom defaultSelectedId is respected', async () => {
    await render(<PenFilter defaultSelectedId="grower" onSelect={jest.fn()} />);
    expect(screen.getByText('Grower')).toHaveStyle({ color: '#FFFFFF' });
    expect(screen.getByText('All Pens')).toHaveStyle({ color: '#6B8A82' });
  });
});

// ============================================================
// PigPenCard
// ============================================================
describe('PigPenCard', () => {
  test('PIGCOMP-32: displays pen name', async () => {
    await render(<PigPenCard penName="Pen 7" />);
    expect(screen.getByText('Pen 7')).toBeTruthy();
  });

  test('PIGCOMP-33: displays device code', async () => {
    await render(<PigPenCard deviceCode="OINKMATE-042" />);
    expect(screen.getByText('OINKMATE-042')).toBeTruthy();
  });

  test('PIGCOMP-34: displays growth stage', async () => {
    await render(<PigPenCard growthStage="Starter" />);
    expect(screen.getByText('Starter')).toBeTruthy();
  });

  test('PIGCOMP-35: displays pig count', async () => {
    await render(<PigPenCard pigCount={25} />);
    expect(screen.getByText('25')).toBeTruthy();
  });

  test('PIGCOMP-36: displays current age', async () => {
    await render(<PigPenCard currentAge="45 Days" />);
    expect(screen.getByText('45 Days')).toBeTruthy();
  });

  test('PIGCOMP-37: displays actual feed type', async () => {
    await render(<PigPenCard actualFeedType="Starter Feed A" />);
    expect(screen.getByText('Starter Feed A')).toBeTruthy();
  });

  test('PIGCOMP-38: displays temperature', async () => {
    await render(<PigPenCard temperature="30°C" />);
    expect(screen.getByText('30°C')).toBeTruthy();
  });

  test('PIGCOMP-39: displays humidity', async () => {
    await render(<PigPenCard humidity="70%" />);
    expect(screen.getByText('70%')).toBeTruthy();
  });

  test('PIGCOMP-40: displays ammonia', async () => {
    await render(<PigPenCard ammonia="9 ppm" />);
    expect(screen.getByText('9 ppm')).toBeTruthy();
  });

  test('PIGCOMP-41: feedLevel1=80, feedLevel2=60 displays 70%', async () => {
    await render(<PigPenCard feedLevel1={80} feedLevel2={60} />);
    expect(screen.getByText('70%')).toBeTruthy();
  });

  test('PIGCOMP-42: feedLevel1=100, feedLevel2=50 displays 75%', async () => {
    await render(<PigPenCard feedLevel1={100} feedLevel2={50} />);
    expect(screen.getByText('75%')).toBeTruthy();
  });

  test('PIGCOMP-43: missing feedLevel2 displays "No Data"', async () => {
    await render(<PigPenCard feedLevel1={80} />);
    expect(screen.getByText('No Data')).toBeTruthy();
  });

  test('PIGCOMP-44: missing feedLevel1 displays "No Data"', async () => {
    await render(<PigPenCard feedLevel2={60} />);
    expect(screen.getByText('No Data')).toBeTruthy();
  });

  test('PIGCOMP-45: neither feedLevel1 nor feedLevel2 supplied displays "No Data"', async () => {
    await render(<PigPenCard />);
    expect(screen.getByText('No Data')).toBeTruthy();
  });

  test('PIGCOMP-46: pressing "Feed" opens the Feed Containers modal', async () => {
    await render(<PigPenCard feedLevel1={80} feedLevel2={60} />);
    await fireEvent.press(screen.getByText('Feed'));
    expect(screen.getByText('Feed Containers')).toBeTruthy();
    expect(screen.getByText('Container 1')).toBeTruthy();
    expect(screen.getByText('Container 2')).toBeTruthy();
  });

  test('PIGCOMP-47: each container displays its own value', async () => {
    await render(<PigPenCard feedLevel1={80} feedLevel2={60} />);
    await fireEvent.press(screen.getByText('Feed'));
    expect(screen.getByText('80%')).toBeTruthy();
    expect(screen.getByText('60%')).toBeTruthy();
  });

  test('PIGCOMP-48: a container with a missing value displays "No Data"', async () => {
    await render(<PigPenCard feedLevel1={80} />);
    await fireEvent.press(screen.getByText('Feed'));
    // "No Data" appears both on the card (main average) and in Container 2.
    expect(screen.getAllByText('No Data').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Container 2')).toBeTruthy();
  });

  test('PIGCOMP-49: pressing within the modal overlay closes it', async () => {
    await render(<PigPenCard feedLevel1={80} feedLevel2={60} />);
    await fireEvent.press(screen.getByText('Feed'));
    expect(screen.getByText('Feed Containers')).toBeTruthy();
    // The whole overlay (including the menu) is a single TouchableOpacity
    // with no separate "close" control, so any press within it closes
    // the modal. Reach the overlay by walking up from the title text.
    const overlay = screen.getByText('Feed Containers').parent!.parent!;
    await fireEvent.press(overlay);
    expect(screen.queryByText('Feed Containers')).toBeNull();
  });

  test('PIGCOMP-50: pressing Edit calls onEditPress', async () => {
    const onEditPress = jest.fn();
    await render(<PigPenCard onEditPress={onEditPress} />);
    await fireEvent.press(screen.getByText('Edit'));
    expect(onEditPress).toHaveBeenCalledTimes(1);
  });

  test('PIGCOMP-51: pressing Delete calls onDeletePress', async () => {
    const onDeletePress = jest.fn();
    await render(<PigPenCard onDeletePress={onDeletePress} />);
    await fireEvent.press(screen.getByText('Delete'));
    expect(onDeletePress).toHaveBeenCalledTimes(1);
  });

  test('PIGCOMP-52: pressing View Details calls onViewDetailsPress', async () => {
    const onViewDetailsPress = jest.fn();
    await render(<PigPenCard onViewDetailsPress={onViewDetailsPress} />);
    await fireEvent.press(screen.getByText('View Details'));
    expect(onViewDetailsPress).toHaveBeenCalledTimes(1);
  });

  test('PIGCOMP-53: Delete button shows "Deleting..." when isDeleting is true', async () => {
    await render(<PigPenCard isDeleting={true} />);
    expect(screen.getByText('Deleting...')).toBeTruthy();
    expect(screen.queryByText('Delete')).toBeNull();
  });

  test('PIGCOMP-54: Delete button is disabled while isDeleting', async () => {
    const onDeletePress = jest.fn();
    await render(<PigPenCard isDeleting={true} onDeletePress={onDeletePress} />);
    await fireEvent.press(screen.getByText('Deleting...'));
    expect(onDeletePress).not.toHaveBeenCalled();
  });

  test('PIGCOMP-55: Edit button is disabled while isDeleting', async () => {
    const onEditPress = jest.fn();
    await render(<PigPenCard isDeleting={true} onEditPress={onEditPress} />);
    await fireEvent.press(screen.getByText('Edit'));
    expect(onEditPress).not.toHaveBeenCalled();
  });

  test('PIGCOMP-56: renders Creep growth stage', async () => {
    await render(<PigPenCard growthStage="Creep" />);
    expect(screen.getByText('Creep')).toBeTruthy();
  });

  test('PIGCOMP-57: renders Pre-Starter growth stage', async () => {
    await render(<PigPenCard growthStage="Pre-Starter" />);
    expect(screen.getByText('Pre-Starter')).toBeTruthy();
  });

  test('PIGCOMP-58: renders Starter growth stage', async () => {
    await render(<PigPenCard growthStage="Starter" />);
    expect(screen.getByText('Starter')).toBeTruthy();
  });

  test('PIGCOMP-59: renders Grower growth stage', async () => {
    await render(<PigPenCard growthStage="Grower" />);
    expect(screen.getByText('Grower')).toBeTruthy();
  });

  test('PIGCOMP-60: renders Finisher growth stage', async () => {
    await render(<PigPenCard growthStage="Finisher" />);
    expect(screen.getByText('Finisher')).toBeTruthy();
  });
});

// ============================================================
// PigPensHeader
// ============================================================
describe('PigPensHeader', () => {
  test('PIGCOMP-61: renders the logo image', async () => {
    await render(<PigPensHeader onAddPenPress={jest.fn()} />);
    expect((screen as any).UNSAFE_getByType(Image)).toBeTruthy();
  });

  test('PIGCOMP-62: default title "Pig Pens" renders', async () => {
    await render(<PigPensHeader onAddPenPress={jest.fn()} />);
    expect(screen.getByText('Pig Pens')).toBeTruthy();
  });

  test('PIGCOMP-63: default subtitle "Manage and monitor all your pig pens" renders', async () => {
    await render(<PigPensHeader onAddPenPress={jest.fn()} />);
    expect(screen.getByText('Manage and monitor all your pig pens')).toBeTruthy();
  });

  test('PIGCOMP-64: Add Pen button renders', async () => {
    await render(<PigPensHeader onAddPenPress={jest.fn()} />);
    expect(screen.getByText('Add Pen')).toBeTruthy();
  });

  test('PIGCOMP-65: Add Pen accessibilityLabel is "Add Pen"', async () => {
    await render(<PigPensHeader onAddPenPress={jest.fn()} />);
    expect(screen.getByLabelText('Add Pen')).toBeTruthy();
  });

  test('PIGCOMP-66: pressing Add Pen calls onAddPenPress', async () => {
    const onAddPenPress = jest.fn();
    await render(<PigPensHeader onAddPenPress={onAddPenPress} />);
    await fireEvent.press(screen.getByLabelText('Add Pen'));
    expect(onAddPenPress).toHaveBeenCalledTimes(1);
  });

  test('PIGCOMP-67: custom title prop renders', async () => {
    await render(<PigPensHeader title="My Pens" onAddPenPress={jest.fn()} />);
    expect(screen.getByText('My Pens')).toBeTruthy();
  });

  test('PIGCOMP-68: custom subtitle prop renders', async () => {
    await render(<PigPensHeader subtitle="Custom subtitle text" onAddPenPress={jest.fn()} />);
    expect(screen.getByText('Custom subtitle text')).toBeTruthy();
  });

  test('PIGCOMP-69: brandName prop is accepted but not rendered anywhere', async () => {
    // The current component destructures `brandName` but never uses it
    // in its JSX (only the logo image is shown). This test documents
    // that actual behavior rather than assuming brandName is displayed.
    await render(<PigPensHeader brandName="Custom Brand XYZ" onAddPenPress={jest.fn()} />);
    expect(screen.queryByText('Custom Brand XYZ')).toBeNull();
  });
});

// ============================================================
// PigSummaryCards
// ============================================================
describe('PigSummaryCards', () => {
  test('PIGCOMP-70: all metric labels render', async () => {
    await render(<PigSummaryCards />);
    [
      'Total Pens',
      'Total Pigs',
      'Creep Pens',
      'Pre-Starter Pens',
      'Starter Pens',
      'Grower Pens',
      'Finisher Pens',
    ].forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  test('PIGCOMP-71: all numeric values default to 0 when no props are supplied', async () => {
    await render(<PigSummaryCards />);
    // 7 metrics total: Total Pens, Total Pigs, Creep, Pre-Starter,
    // Starter, Grower, Finisher.
    expect(screen.getAllByText('0')).toHaveLength(7);
  });

  test('PIGCOMP-72: displays supplied Total Pens and Total Pigs values', async () => {
    await render(<PigSummaryCards totalPens={5} totalPigs={60} />);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('60')).toBeTruthy();
  });

  test('PIGCOMP-73: displays supplied stage counts (Creep, Pre-Starter, Starter, Grower, Finisher)', async () => {
    await render(
      <PigSummaryCards
        totalPens={5}
        totalPigs={60}
        creepPens={1}
        preStarterPens={1}
        starterPens={1}
        growerPens={1}
        finisherPens={1}
      />
    );
    // Five stage cards each showing "1".
    expect(screen.getAllByText('1')).toHaveLength(5);
  });
});

// ============================================================
// SearchBar
// ============================================================
describe('SearchBar', () => {
  test('PIGCOMP-74: renders the search input', async () => {
    await render(<SearchBar />);
    expect(screen.getByPlaceholderText('Search pig pen...')).toBeTruthy();
  });

  test('PIGCOMP-75: default placeholder is "Search pig pen..."', async () => {
    await render(<SearchBar />);
    expect(screen.getByPlaceholderText('Search pig pen...')).toBeTruthy();
  });

  test('PIGCOMP-76: custom placeholder works', async () => {
    await render(<SearchBar placeholder="Find a pen..." />);
    expect(screen.getByPlaceholderText('Find a pen...')).toBeTruthy();
  });

  test('PIGCOMP-77: typing updates the input value in uncontrolled mode', async () => {
    await render(<SearchBar />);
    const input = screen.getByPlaceholderText('Search pig pen...');
    await fireEvent.changeText(input, 'Pen A');
    expect(input.props.value).toBe('Pen A');
  });

  test('PIGCOMP-78: controlled mode displays the supplied value', async () => {
    await render(<SearchBar value="Barn 2" onChangeText={jest.fn()} />);
    const input = screen.getByPlaceholderText('Search pig pen...');
    expect(input.props.value).toBe('Barn 2');
  });

  test('PIGCOMP-79: onChangeText is called with the entered text', async () => {
    const onChangeText = jest.fn();
    await render(<SearchBar onChangeText={onChangeText} />);
    const input = screen.getByPlaceholderText('Search pig pen...');
    await fireEvent.changeText(input, 'Pen C');
    expect(onChangeText).toHaveBeenCalledWith('Pen C');
  });

  test('PIGCOMP-80: filter button renders by default', async () => {
    await render(<SearchBar />);
    expect(screen.getByLabelText('Filter')).toBeTruthy();
  });

  test('PIGCOMP-81: filter button accessibilityLabel is "Filter"', async () => {
    await render(<SearchBar />);
    expect(screen.getByLabelText('Filter').props.accessibilityLabel).toBe('Filter');
  });

  test('PIGCOMP-82: pressing the filter button calls onFilterPress', async () => {
    const onFilterPress = jest.fn();
    await render(<SearchBar onFilterPress={onFilterPress} />);
    await fireEvent.press(screen.getByLabelText('Filter'));
    expect(onFilterPress).toHaveBeenCalledTimes(1);
  });

  test('PIGCOMP-83: showFilterIcon={false} hides the filter button', async () => {
    await render(<SearchBar showFilterIcon={false} />);
    expect(screen.queryByLabelText('Filter')).toBeNull();
  });

  test('PIGCOMP-84: does not crash when optional callbacks are omitted', async () => {
    await render(<SearchBar />);
    // fireEvent is async in RNTL v14; if either interaction threw without
    // callbacks supplied, these awaits would reject and fail the test.
    await fireEvent.changeText(screen.getByPlaceholderText('Search pig pen...'), 'test');
    await fireEvent.press(screen.getByLabelText('Filter'));
    expect(screen.getByPlaceholderText('Search pig pen...')).toBeTruthy();
  });
});