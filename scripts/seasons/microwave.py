# scripts/seasons/microwave.py — 27 Nov 2026 v1
# Phase 43. Microwave cooking: proper meals and puddings made start to
# finish in the microwave, so the Microwave filter finds more than a reheat.
# Times are for an 800 W microwave; every note says so.
from build import Book

b = Book('microwave', 'Microwave', 'mw')
R = b.R
W = 'Times are for an 800 W microwave. Add a little longer at lower power, a little less at higher.'

R('mug-chocolate-sponge', 'Chocolate mug sponge', 'pudding',
  ['flour-self-raising 4tbsp', 'sugar-caster 3tbsp', 'cocoa-powder 2tbsp', 'egg-medium 1', 'milk-whole 3tbsp', 'vegetable-oil 2tbsp'],
  ['Mix {flour-self-raising}, {sugar-caster} and {cocoa-powder} in a large mug.',
   'Beat in {egg-medium}, {milk-whole} and {vegetable-oil} with a fork until smooth.',
   'Microwave on high 90 seconds, until risen and set on top.',
   'Leave 1 minute before eating. || The mug is very hot.'],
  serves=1, tier='budget', note=W)

R('jacket-potato', 'Microwave jacket potatoes with cheese and beans', 'main',
  ['potato-large 2', 'baked-beans 1', 'cheddar-cheese 60g', 'butter-unsalted 15g'],
  ['Prick {potato-large} all over with a fork.',
   'Microwave on high 10 minutes, turning halfway, until soft all through.',
   'Heat {baked-beans} in a covered bowl 2 minutes, stirring once.',
   'Split the potatoes. Add {butter-unsalted}, the beans and grated {cheddar-cheese}.'],
  serves=2, tier='budget', note=W + ' For crisp skins, finish in a hot oven 10 minutes.')

R('porridge', 'Microwave porridge with banana', 'breakfast',
  ['oats-rolled 50g', 'milk-semi-skimmed 250ml', 'banana-medium 1', 'honey 1tsp'],
  ['Put {oats-rolled} and {milk-semi-skimmed} in a large bowl. || A big bowl stops it boiling over.',
   'Microwave on high 2 minutes. Stir.',
   'Microwave 1 minute more, until thick and creamy.',
   'Slice {banana-medium} on top. Drizzle with {honey}.'],
  serves=1, tier='budget', slot='breakfast', note=W)

R('scrambled-eggs', 'Microwave scrambled eggs on toast', 'breakfast',
  ['egg-medium 3', 'milk-whole 2tbsp', 'butter-unsalted 10g', 'bread-slice-medium 2', 'chives 5g'],
  ['Beat {egg-medium} and {milk-whole} in a bowl. Add {butter-unsalted}.',
   'Microwave on high 40 seconds. Stir with a fork.',
   'Microwave 30 seconds more. Stir. Repeat until barely set.',
   'Toast {bread-slice-medium}. Spoon the eggs on top. Snip over {chives}.'],
  serves=1, tier='budget', slot='breakfast', note=W + ' Take them out slightly wet; they finish cooking in the bowl.')

R('mushroom-risotto', 'Microwave mushroom risotto', 'main',
  ['butter-unsalted 20g', 'onion-medium 1', 'mushroom-chestnut 8', 'rice-arborio-dry 150g', 'stock-vegetable 500ml', 'parmesan 30g'],
  ['Chop {onion-medium}. Put in a large bowl with {butter-unsalted}. Microwave 2 minutes.',
   'Slice {mushroom-chestnut}. Add with {rice-arborio-dry}. Stir to coat.',
   'Add half of {stock-vegetable}, hot. Cover loosely. Microwave 6 minutes.',
   'Stir. Add the rest of the stock. Microwave 6 minutes more, until the rice is tender.',
   'Stir in grated {parmesan}. Leave 2 minutes to thicken.'],
  serves=2, tier='budget', note=W)

R('ginger-salmon', 'Microwave salmon with ginger and soy', 'main',
  ['pak-choi 2', 'salmon-fillet 2', 'ginger-fresh 1tsp', 'soy-sauce 2tbsp', 'spring-onion 2', 'rice-white-cooked 1'],
  ['Halve {pak-choi}. Lay in a shallow dish.',
   'Put {salmon-fillet} on top. Spoon over {soy-sauce} and grated {ginger-fresh}.',
   'Cover with a plate. Microwave on high 4 minutes, until the fish flakes.',
   'Heat {rice-white-cooked} for the time on the pouch.',
   'Scatter sliced {spring-onion} over the fish. Serve with the rice.'],
  serves=2, tier='everyday', note=W)

R('mac-cheese', 'Microwave macaroni cheese', 'main',
  ['penne-dry 150g', 'water 400ml', 'milk-whole 100ml', 'cheddar-cheese 100g', 'mustard-dijon 0.5tsp'],
  ['Put {penne-dry} and {water} in a large bowl.',
   'Microwave on high 10 minutes, stirring halfway, until the pasta is tender. Drain any water left.',
   'Stir in {milk-whole}, grated {cheddar-cheese} and {mustard-dijon}.',
   'Microwave 1 minute. Stir until smooth and saucy.'],
  serves=2, tier='budget', note=W)

R('syrup-sponge', 'Microwave golden syrup sponge', 'pudding',
  ['golden-syrup 3tbsp', 'butter-unsalted 100g', 'sugar-caster 100g', 'egg-medium 2', 'flour-self-raising 100g', 'milk-whole 2tbsp'],
  ['Grease a 1 litre microwave-safe bowl. Spoon {golden-syrup} into the bottom.',
   'Beat soft {butter-unsalted} with {sugar-caster}. Beat in {egg-medium}.',
   'Fold in {flour-self-raising} and {milk-whole}. Spoon over the syrup.',
   'Cover loosely. Microwave on high 4 minutes, until risen and springy.',
   'Leave 2 minutes. Turn out onto a plate.'],
  serves=4, tier='budget', note=W)

R('steamed-greens', 'Microwave steamed greens with lemon', 'side',
  ['broccoli-head 1', 'green-beans 150g', 'olive-oil 1tbsp', 'lemon 1'],
  ['Cut {broccoli-head} into florets. Put in a bowl with {green-beans} and 2 tbsp water.',
   'Cover with a plate. Microwave on high 4 minutes, until bright green and tender.',
   'Drain.',
   'Toss with {olive-oil} and the juice of {lemon}.'],
  serves=4, tier='budget', note=W)

R('sweet-potato-beans', 'Microwave sweet potato with black beans', 'main',
  ['sweet-potato 2', 'black-beans-tinned 1', 'cumin-ground 1tsp', 'salsa-dip 100g', 'lime 1'],
  ['Prick {sweet-potato} all over.',
   'Microwave on high 8 minutes, turning halfway, until soft.',
   'Heat drained {black-beans-tinned} with {cumin-ground} in a covered bowl 2 minutes.',
   'Split the potatoes. Fill with the beans and {salsa-dip}. Squeeze over {lime}.'],
  serves=2, tier='budget', note=W)

R('chilli', 'Microwave chilli con carne', 'main',
  ['onion-medium 1', 'beef-mince-5-fat 250g', 'chilli-powder 1tsp', 'chopped-tomatoes-tinned 1', 'kidney-beans-tinned 1', 'rice-white-cooked 1'],
  ['Chop {onion-medium}. Put in a large bowl with {beef-mince-5-fat}.',
   'Microwave on high 5 minutes, breaking up the mince with a fork halfway.',
   'Stir in {chilli-powder}, {chopped-tomatoes-tinned} and drained {kidney-beans-tinned}.',
   'Cover loosely. Microwave 8 minutes, stirring halfway, until thick and the meat is cooked through.',
   'Heat {rice-white-cooked} for the time on the pouch.'],
  serves=2, tier='budget', note=W)

R('baked-apple', 'Microwave baked apple', 'pudding',
  ['apple-medium 2', 'sultanas 20g', 'maple-syrup 2tbsp', 'cinnamon-ground 0.5tsp'],
  ['Core {apple-medium}. Score a line round the middle of each.',
   'Mix {sultanas} with {cinnamon-ground}. Stuff into the apples.',
   'Stand in a dish. Pour over {maple-syrup}.',
   'Cover. Microwave on high 4 minutes, until soft.'],
  serves=2, tier='budget', note=W)

R('coconut-dal', 'Microwave coconut dal', 'main',
  ['lentils-red-dry 150g', 'coconut-milk-tinned 1', 'stock-vegetable 300ml', 'curry-powder 1tbsp', 'garlic-clove 1', 'spinach 80g'],
  ['Rinse {lentils-red-dry}. Put in a large bowl with {coconut-milk-tinned}, {stock-vegetable} and {curry-powder}.',
   'Crush in {garlic-clove}.',
   'Cover loosely. Microwave on high 15 minutes, stirring every 5, until the lentils collapse.',
   'Stir in {spinach}. Microwave 1 minute more.'],
  serves=3, tier='budget', note=W)

R('lemon-mug-pudding', 'Lemon curd mug pudding', 'pudding',
  ['flour-self-raising 4tbsp', 'sugar-caster 2tbsp', 'egg-medium 1', 'milk-whole 2tbsp', 'vegetable-oil 1tbsp', 'lemon 1'],
  ['Mix {flour-self-raising} and {sugar-caster} in a large mug.',
   'Beat in {egg-medium}, {milk-whole}, {vegetable-oil} and the zest of {lemon}.',
   'Microwave on high 75 seconds, until risen.',
   'Squeeze over a little of the lemon juice.'],
  serves=1, tier='budget', note=W)
