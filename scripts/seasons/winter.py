# scripts/seasons/winter.py — 27 Nov 2026 v1
# Winter (January to March, beyond Christmas): soups, stews and dumplings,
# leeks, cabbage and roots, citrus, steamed and baked puddings.
from build import Book

b = Book('winter', 'Winter', 'win')
R, M = b.R, b.M

# ---- Starters ----
R('leek-potato-soup', 'Leek and potato soup', 'starter',
  ['olive-oil 2tbsp', 'leek 3', 'onion-medium 1', 'potato-medium 3', 'stock-vegetable 1200ml', 'chives 10g'],
  ['Put a large pan on a medium heat. Add {olive-oil}.',
   'Slice {leek} and chop {onion-medium}. Fry 10 minutes, until soft but not brown.',
   'Peel and dice {potato-medium}. Add with {stock-vegetable}.',
   'Simmer 20 minutes, until the potato is soft.',
   'Blend until smooth.',
   'Snip {chives} over the top.'],
  serves=6, tier='budget')

R('french-onion-soup', 'French onion soup with cheese toasts', 'starter',
  ['butter-unsalted 40g', 'onion-large 4', 'sugar-caster 1tsp', 'flour-plain 1tbsp', 'wine-white 150ml', 'stock-vegetable 1200ml', 'fresh-thyme 4', 'sourdough 6', 'gruyere 120g'],
  ['Melt {butter-unsalted} in a large pan on a low heat.',
   'Slice {onion-large} thinly. Add with {sugar-caster}.',
   'Cook 40 minutes, stirring now and then, until deep golden. || Slow is the point. High heat burns them bitter.',
   'Stir in {flour-plain}. Add {wine-white}, {stock-vegetable} and {fresh-thyme}.',
   'Simmer 20 minutes.',
   'Toast {sourdough}. Top with grated {gruyere}. Grill until bubbling. Float on the soup.'],
  serves=6, tier='budget', swaps=[('gruyere', 'Most Gruyère is made with animal rennet; use a vegetarian Alpine-style cheese if that matters')])

R('scotch-broth', 'Scotch broth', 'starter',
  ['lamb-leg 300g', 'pearl-barley 80g', 'onion-medium 1', 'carrot-medium 2', 'swede 200g', 'leek 1', 'stock-cube 1', 'fresh-parsley 10g'],
  ['Dice {lamb-leg}. Put in a large pan with 1.5 litres of water and {stock-cube}.',
   'Rinse {pearl-barley}. Add. Simmer 40 minutes.',
   'Dice {onion-medium}, {carrot-medium}, {swede} and {leek}. Add.',
   'Simmer 30 minutes more, until the barley and vegetables are tender.',
   'Stir in chopped {fresh-parsley}.'],
  serves=6, tier='budget')

R('chicken-sweetcorn-soup', 'Chicken and sweetcorn soup', 'starter',
  ['stock-chicken 1000ml', 'ginger-fresh 1tbsp', 'chicken-breast-skinless 1', 'sweetcorn-tinned 1', 'cornflour 2tbsp', 'egg-medium 1', 'soy-sauce 1tbsp', 'spring-onion 3'],
  ['Simmer {stock-chicken} and {ginger-fresh} in a pan.',
   'Slice {chicken-breast-skinless} thinly. Add. Simmer 6 minutes, until cooked.',
   'Add drained {sweetcorn-tinned} and {soy-sauce}.',
   'Mix {cornflour} with 3 tbsp cold water. Stir in until the soup thickens.',
   'Beat {egg-medium}. Pour in slowly, stirring, so it sets in ribbons.',
   'Scatter with sliced {spring-onion}.'],
  serves=4, tier='budget')

R('orange-fennel-salad', 'Orange, fennel and olive salad', 'starter',
  ['orange 3', 'fennel-bulb 1', 'red-onion 1', 'olives-pitted 50g', 'olive-oil 2tbsp', 'fresh-mint 5g'],
  ['Cut the peel and pith off {orange}. Slice into rounds.',
   'Slice {fennel-bulb} and {red-onion} very thinly.',
   'Arrange on a plate with {olives-pitted}.',
   'Drizzle with {olive-oil}. Scatter {fresh-mint} leaves.'],
  serves=4, tier='budget', note='Blood oranges, when you can find them in January, make it.')

R('welsh-rarebit', 'Welsh rarebit', 'starter',
  ['cheddar-cheese 200g', 'mustard-dijon 1tsp', 'milk-whole 3tbsp', 'egg-yolk 1', 'bread-slice-medium 4', 'cayenne-pepper 0.25tsp'],
  ['Heat the grill to high.',
   'Grate {cheddar-cheese}. Mix with {mustard-dijon}, {milk-whole}, {egg-yolk} and {cayenne-pepper}.',
   'Toast {bread-slice-medium} on one side.',
   'Spread the cheese on the untoasted side.',
   'Grill 3 minutes, until bubbling and browned.'],
  serves=4, tier='budget')

R('smoked-haddock-chowder', 'Smoked haddock chowder', 'starter',
  ['butter-unsalted 25g', 'onion-medium 1', 'potato-medium 2', 'milk-whole 600ml', 'haddock-smoked 300g', 'sweetcorn-tinned 1', 'fresh-parsley 10g'],
  ['Melt {butter-unsalted} in a pan. Chop {onion-medium}. Fry 6 minutes.',
   'Dice {potato-medium}. Add with {milk-whole}.',
   'Simmer 12 minutes, until the potato is tender.',
   'Add {haddock-smoked} in chunks and drained {sweetcorn-tinned}.',
   'Simmer 5 minutes, until the fish flakes.',
   'Stir in chopped {fresh-parsley}.'],
  serves=4, tier='everyday')

R('garlic-prawns', 'Sizzling garlic prawns', 'starter',
  ['olive-oil 5tbsp', 'garlic-clove 4', 'chilli-flakes 0.5tsp', 'king-prawns-raw 300g', 'fresh-parsley 10g', 'sourdough 4'],
  ['Put a frying pan on a medium heat. Add {olive-oil}.',
   'Slice {garlic-clove}. Fry with {chilli-flakes} 1 minute, until pale gold.',
   'Turn up the heat. Add {king-prawns-raw}. Cook 3 minutes, until pink.',
   'Scatter with chopped {fresh-parsley}.',
   'Serve sizzling with {sourdough} for the oil.'],
  serves=4, tier='special')

# ---- Mains ----
R('beef-stew-dumplings', 'Beef stew with dumplings', 'main',
  ['beef-braising 800g', 'flour-plain 2tbsp', 'olive-oil 2tbsp', 'onion-medium 2', 'carrot-medium 3', 'stock-cube 2', 'tomato-purée 1tbsp', 'bay-leaf 2', 'flour-self-raising 150g', 'suet-vegetable 75g'],
  ['Heat the oven to 160C. Dice {beef-braising}. Toss in {flour-plain}.',
   'Brown in {olive-oil} in a casserole, in batches. Lift out.',
   'Chop {onion-medium} and {carrot-medium}. Fry 8 minutes.',
   'Add {tomato-purée}, {stock-cube} in 800 ml water and {bay-leaf}. Return the beef. Cover.',
   'Cook in the oven 2 hours.',
   '## Dumplings',
   'Mix {flour-self-raising} and {suet-vegetable} with cold water to a soft dough.',
   'Roll into 8 balls. Sit on the stew. Cook uncovered 25 minutes, until risen.'],
  serves=6, tier='budget')

R('toad-in-the-hole', 'Toad in the hole with onion gravy', 'main',
  ['sausage-pork 8', 'vegetable-oil 3tbsp', 'flour-plain 140g', 'egg-medium 3', 'milk-whole 250ml', 'onion-medium 2', 'gravy-granules 4tbsp'],
  ['Heat the oven to 220C. Put {sausage-pork} and {vegetable-oil} in a roasting tin.',
   'Roast 10 minutes.',
   'Whisk {flour-plain}, {egg-medium} and {milk-whole} to a smooth batter.',
   'Pour round the sausages at once, while the fat is sizzling.',
   'Bake 30 minutes, until risen and golden. Do not open the oven.',
   'Fry sliced {onion-medium} 15 minutes until soft. Add {gravy-granules} with 500 ml boiling water.'],
  serves=4, tier='budget', note='The fat must be smoking hot when the batter goes in, or it will not rise.')

R('lancashire-hotpot', 'Lancashire hotpot', 'main',
  ['lamb-leg 800g', 'olive-oil 2tbsp', 'onion-medium 2', 'carrot-medium 2', 'flour-plain 2tbsp', 'stock-cube 1', 'fresh-thyme 4', 'potato-large 3', 'butter-unsalted 25g'],
  ['Heat the oven to 170C. Dice {lamb-leg}. Brown in {olive-oil}. Lift out.',
   'Slice {onion-medium} and {carrot-medium}. Fry 8 minutes.',
   'Stir in {flour-plain}. Add {stock-cube} in 500 ml water and {fresh-thyme}.',
   'Return the lamb. Tip into a deep dish.',
   'Slice {potato-large} thinly. Layer over the top. Dot with {butter-unsalted}.',
   'Cover. Bake 1 hour 30 minutes. Uncover. Bake 30 minutes more, until golden.'],
  serves=6, tier='everyday')

R('salmon-leeks-mustard', 'Salmon with leeks and mustard sauce', 'main',
  ['butter-unsalted 25g', 'leek 3', 'salmon-fillet 4', 'creme-fraiche 200ml', 'wholegrain-mustard 1tbsp', 'lemon 1', 'fresh-dill 10g'],
  ['Heat the oven to 200C.',
   'Melt {butter-unsalted} in an ovenproof pan. Slice {leek}. Fry 8 minutes, until soft.',
   'Stir in {creme-fraiche} and {wholegrain-mustard}.',
   'Lay {salmon-fillet} on top.',
   'Bake 15 minutes, until the salmon flakes.',
   'Squeeze over {lemon}. Scatter with {fresh-dill}.'],
  serves=4, tier='everyday')

R('fish-pie', 'Classic fish pie', 'main',
  ['potato-large 4', 'butter-unsalted 60g', 'milk-whole 600ml', 'cod-fillet 2', 'haddock-smoked 250g', 'flour-plain 3tbsp', 'peas-frozen 150g', 'fresh-parsley 15g', 'cheddar-cheese 50g'],
  ['Heat the oven to 200C. Peel {potato-large}. Boil 20 minutes. Mash with a third of {butter-unsalted}.',
   'Simmer {cod-fillet} and {haddock-smoked} in {milk-whole} 6 minutes. Lift out. Keep the milk.',
   'Melt the rest of the butter. Stir in {flour-plain}. Add the milk slowly, stirring until thick.',
   'Flake in the fish. Add {peas-frozen} and chopped {fresh-parsley}. Tip into a dish.',
   'Top with the mash. Scatter {cheddar-cheese}.',
   'Bake 30 minutes, until golden and bubbling.'],
  serves=6, tier='everyday')

R('prawn-noodle-soup', 'King prawn noodle soup', 'main',
  ['stock-vegetable 1200ml', 'thai-red-curry-paste 2tbsp', 'coconut-milk-tinned 1', 'rice-noodles-dry 200g', 'king-prawns-raw 300g', 'pak-choi 2', 'lime 1', 'fish-sauce 1tbsp', 'fresh-coriander 10g'],
  ['Fry {thai-red-curry-paste} in a large pan 1 minute.',
   'Add {stock-vegetable} and {coconut-milk-tinned}. Simmer 5 minutes.',
   'Soak {rice-noodles-dry} in boiling water for the time on the packet. Drain into bowls.',
   'Add {king-prawns-raw} and halved {pak-choi} to the soup. Cook 3 minutes.',
   'Stir in {fish-sauce} and the juice of {lime}.',
   'Ladle over the noodles. Top with {fresh-coriander}.'],
  serves=4, tier='everyday')

R('macaroni-cheese', 'Macaroni cheese', 'main',
  ['penne-dry 350g', 'butter-unsalted 50g', 'flour-plain 50g', 'milk-whole 800ml', 'cheddar-cheese 250g', 'mustard-dijon 1tsp', 'cherry-tomato 8'],
  ['Heat the oven to 200C. Cook {penne-dry} 2 minutes less than the packet says. Drain.',
   'Melt {butter-unsalted}. Stir in {flour-plain} 1 minute.',
   'Add {milk-whole} slowly, stirring until thick.',
   'Stir in most of {cheddar-cheese} and {mustard-dijon}.',
   'Mix with the pasta. Tip into a dish. Top with halved {cherry-tomato} and the rest of the cheese.',
   'Bake 20 minutes, until bubbling.'],
  serves=6, tier='budget')

R('leek-cheddar-bake', 'Leek, potato and cheddar bake', 'main',
  ['potato-large 4', 'leek 3', 'butter-unsalted 30g', 'double-cream 300ml', 'garlic-clove 2', 'cheddar-cheese 150g', 'fresh-thyme 4'],
  ['Heat the oven to 180C.',
   'Slice {potato-large} thinly. Slice {leek}.',
   'Fry the leeks in {butter-unsalted} 8 minutes, until soft.',
   'Warm {double-cream} with crushed {garlic-clove} and {fresh-thyme}.',
   'Layer potatoes, leeks and most of {cheddar-cheese} in a dish. Pour over the cream.',
   'Top with the rest of the cheese. Bake 1 hour, until tender and golden.'],
  serves=6, tier='everyday')

R('mushroom-stroganoff', 'Mushroom stroganoff', 'main',
  ['rice-basmati-dry 300g', 'olive-oil 2tbsp', 'onion-medium 1', 'garlic-clove 2', 'mushroom-chestnut 20', 'smoked-paprika 2tsp', 'stock-vegetable 200ml', 'soured-cream 200ml', 'fresh-parsley 10g'],
  ['Cook {rice-basmati-dry} for the time on the packet.',
   'Fry chopped {onion-medium} in {olive-oil} 8 minutes.',
   'Add sliced {garlic-clove} and {mushroom-chestnut}. Fry 8 minutes, until browned.',
   'Stir in {smoked-paprika}. Add {stock-vegetable}. Bubble 3 minutes.',
   'Take off the heat. Stir in {soured-cream}.',
   'Scatter with {fresh-parsley}. Serve with the rice.'],
  serves=4, tier='budget')

R('root-stew-dumplings', 'Root vegetable stew with herb dumplings', 'main',
  ['olive-oil 2tbsp', 'onion-medium 1', 'carrot-medium 3', 'parsnip 2', 'swede 300g', 'lentils-green-dry 100g', 'stock-vegetable 1200ml', 'tomato-purée 2tbsp', 'flour-self-raising 150g', 'suet-vegetable 75g', 'fresh-parsley 15g'],
  ['Fry chopped {onion-medium} in {olive-oil} 8 minutes in a casserole.',
   'Dice {carrot-medium}, {parsnip} and {swede}. Add with {lentils-green-dry}.',
   'Add {stock-vegetable} and {tomato-purée}. Simmer 25 minutes.',
   '## Dumplings',
   'Mix {flour-self-raising}, {suet-vegetable} and chopped {fresh-parsley} with cold water to a soft dough.',
   'Roll into 8 balls. Sit on the stew. Cover. Simmer 20 minutes, until risen and fluffy.'],
  serves=6, tier='budget')

R('chickpea-spinach-curry', 'Chickpea and spinach curry', 'main',
  ['vegetable-oil 2tbsp', 'onion-medium 1', 'garlic-clove 3', 'ginger-fresh 1tbsp', 'curry-powder 2tbsp', 'chopped-tomatoes-tinned 1', 'chickpeas-tinned 2', 'coconut-milk-tinned 1', 'spinach 200g', 'rice-basmati-dry 300g'],
  ['Cook {rice-basmati-dry} for the time on the packet.',
   'Fry chopped {onion-medium} in {vegetable-oil} 8 minutes.',
   'Add {garlic-clove}, {ginger-fresh} and {curry-powder}. Fry 1 minute.',
   'Add {chopped-tomatoes-tinned}, drained {chickpeas-tinned} and {coconut-milk-tinned}.',
   'Simmer 15 minutes, until thick.',
   'Stir in {spinach} until wilted.'],
  serves=4, tier='budget')

R('sausage-bean-casserole', 'Plant sausage and bean casserole', 'main',
  ['plant-sausages 8', 'olive-oil 2tbsp', 'onion-medium 1', 'garlic-clove 2', 'smoked-paprika 2tsp', 'chopped-tomatoes-tinned 1', 'butter-beans-tinned 2', 'stock-vegetable 300ml', 'kale 100g'],
  ['Brown {plant-sausages} in {olive-oil} 6 minutes. Lift out. Slice.',
   'Chop {onion-medium}. Fry 8 minutes.',
   'Add {garlic-clove} and {smoked-paprika}. Fry 1 minute.',
   'Add {chopped-tomatoes-tinned}, drained {butter-beans-tinned} and {stock-vegetable}.',
   'Return the sausages. Simmer 15 minutes.',
   'Stir in {kale}. Cook 4 minutes, until tender.'],
  serves=4, tier='budget', note='Check the sausage packet says vegan; some plant sausages contain egg.')

# ---- Sides ----
R('buttery-mash', 'Buttery mash', 'side',
  ['potato-large 4', 'butter-unsalted 50g', 'milk-whole 150ml', 'salt 0.5tsp'],
  ['Peel and chop {potato-large}. Boil 20 minutes, until soft.',
   'Drain. Leave in the pan 2 minutes to steam dry.',
   'Mash with {butter-unsalted} and warm {milk-whole}.',
   'Season with {salt}.'],
  serves=4, tier='budget')

R('caraway-cabbage', 'Cabbage with caraway', 'side',
  ['cabbage-white 1', 'olive-oil 2tbsp', 'caraway-seeds 1tsp', 'lemon 1'],
  ['Shred half of {cabbage-white} finely.',
   'Fry {caraway-seeds} in {olive-oil} 30 seconds.',
   'Add the cabbage and a splash of water. Stir-fry 6 minutes, until tender.',
   'Squeeze over {lemon}.'],
  serves=4, tier='budget')

R('maple-parsnips', 'Maple roast parsnips', 'side',
  ['parsnip 6', 'olive-oil 2tbsp', 'maple-syrup 2tbsp', 'fresh-thyme 4'],
  ['Heat the oven to 200C.',
   'Quarter {parsnip} lengthways. Toss with {olive-oil}.',
   'Roast 30 minutes.',
   'Drizzle with {maple-syrup}. Add {fresh-thyme}. Roast 10 minutes, until sticky.'],
  serves=6, tier='budget')

R('carrot-swede-mash', 'Carrot and swede mash', 'side',
  ['swede 600g', 'carrot-large 3', 'butter-unsalted 30g', 'black-pepper-ground 0.5tsp'],
  ['Peel and dice {swede} and {carrot-large}.',
   'Boil 25 minutes, until soft.',
   'Drain well. Mash with {butter-unsalted}.',
   'Season with plenty of {black-pepper-ground}.'],
  serves=6, tier='budget')

R('braised-leeks', 'Braised leeks', 'side',
  ['leek 4', 'butter-unsalted 25g', 'stock-vegetable 200ml', 'fresh-thyme 3'],
  ['Cut {leek} into 5 cm lengths.',
   'Melt {butter-unsalted} in a wide pan. Add the leeks.',
   'Add {stock-vegetable} and {fresh-thyme}. Cover.',
   'Simmer 15 minutes, until soft. Uncover and bubble 3 minutes to reduce.'],
  serves=4, tier='budget')

# ---- Puddings ----
R('jam-roly-poly', 'Jam roly-poly with custard', 'pudding',
  ['flour-self-raising 250g', 'suet-vegetable 125g', 'sugar-caster 50g', 'milk-whole 150ml', 'jam-strawberry 6tbsp', 'custard-ready 500ml'],
  ['Heat the oven to 180C.',
   'Mix {flour-self-raising}, {suet-vegetable} and {sugar-caster}. Add {milk-whole} to a soft dough.',
   'Roll out to a 30 by 20 cm rectangle.',
   'Spread with {jam-strawberry}, leaving a border. Roll up from the short side.',
   'Wrap loosely in greased foil. Bake 1 hour, until risen.',
   'Slice. Serve with hot {custard-ready}.'],
  serves=6, tier='budget')

R('treacle-tart', 'Treacle tart', 'pudding',
  ['shortcrust-pastry 320g', 'golden-syrup 400g', 'breadcrumbs-dried 100g', 'lemon 1', 'egg-medium 1', 'double-cream 3tbsp'],
  ['Heat the oven to 190C. Line a 23 cm tin with {shortcrust-pastry}.',
   'Bake 15 minutes with baking beans. Take them out.',
   'Warm {golden-syrup} until runny.',
   'Stir in {breadcrumbs-dried}, the zest and juice of {lemon}, {egg-medium} and {double-cream}.',
   'Pour into the case. Lower the oven to 170C.',
   'Bake 30 minutes, until set with a slight wobble.'],
  serves=8, tier='budget')

R('chocolate-puddle-pudding', 'Chocolate puddle pudding', 'pudding',
  ['flour-self-raising 125g', 'cocoa-powder 5tbsp', 'sugar-caster 125g', 'milk-whole 150ml', 'butter-unsalted 50g', 'egg-medium 1', 'sugar-soft-brown 100g'],
  ['Heat the oven to 180C.',
   'Mix {flour-self-raising}, 2 tbsp of {cocoa-powder} and {sugar-caster}.',
   'Melt {butter-unsalted}. Whisk with {milk-whole} and {egg-medium}. Stir into the flour.',
   'Spread in a baking dish.',
   'Mix {sugar-soft-brown} and the rest of the cocoa. Sprinkle over. Pour 300 ml boiling water on top.',
   'Bake 30 minutes. The sauce sinks to the bottom.'],
  serves=6, tier='budget', note='It looks wrong going in. Trust it.')

R('baked-rice-pudding', 'Baked rice pudding', 'pudding',
  ['rice-arborio-dry 100g', 'sugar-caster 50g', 'milk-whole 900ml', 'butter-unsalted 15g', 'nutmeg 0.5tsp', 'jam-strawberry 4tbsp'],
  ['Heat the oven to 150C. Butter a baking dish with {butter-unsalted}.',
   'Put in {rice-arborio-dry} and {sugar-caster}.',
   'Pour over {milk-whole}. Grate over {nutmeg}.',
   'Bake 2 hours, stirring once after 30 minutes, until creamy with a golden skin.',
   'Serve with a spoon of {jam-strawberry}.'],
  serves=6, tier='budget')

R('poached-pears', 'Spiced poached pears', 'pudding',
  ['sugar-caster 150g', 'water 800ml', 'cinnamon-stick 1', 'star-anise 2', 'orange 1', 'pear 4', 'coconut-yoghurt 200g'],
  ['Put {sugar-caster}, {water}, {cinnamon-stick}, {star-anise} and pared zest of {orange} in a pan.',
   'Heat until the sugar dissolves.',
   'Peel {pear}, keeping the stalks. Lower into the syrup.',
   'Simmer 25 minutes, turning, until a knife slides in.',
   'Lift out. Bubble the syrup 10 minutes, until thick. Spoon over. Serve with {coconut-yoghurt}.'],
  serves=4, tier='budget')

R('sticky-date-pudding', 'Vegan sticky date pudding', 'pudding',
  ['dates-pitted 20', 'oat-milk 200ml', 'bicarbonate-of-soda 1tsp', 'dairy-free-spread 125g', 'sugar-muscovado 175g', 'flour-self-raising 175g', 'golden-syrup 3tbsp'],
  ['Heat the oven to 180C. Line a 20 cm square tin.',
   'Chop {dates-pitted}. Simmer in {oat-milk} 5 minutes. Stir in {bicarbonate-of-soda}.',
   'Beat half of {dairy-free-spread} with 100 g of {sugar-muscovado}.',
   'Stir in the dates and {flour-self-raising}. Spread in the tin. Bake 30 minutes.',
   '## Sauce',
   'Melt the rest of the spread and sugar with {golden-syrup}. Bubble 2 minutes. Pour over.'],
  serves=8, tier='budget')

R('citrus-salad', 'Winter citrus salad with pomegranate', 'pudding',
  ['orange 3', 'grapefruit 1', 'clementine 4', 'pomegranate-seeds 80g', 'fresh-mint 5g', 'maple-syrup 2tbsp'],
  ['Cut the peel and pith off {orange}, {grapefruit} and {clementine}.',
   'Slice into rounds. Lay on a plate.',
   'Scatter with {pomegranate-seeds} and {fresh-mint}.',
   'Drizzle with {maple-syrup}.'],
  serves=6, tier='budget')

# ---- Drinks ----
R('hot-chocolate', 'Proper hot chocolate', 'drink',
  ['milk-whole 800ml', 'dark-chocolate 100g', 'sugar-caster 2tbsp', 'vanilla-extract 0.5tsp'],
  ['Warm {milk-whole} in a pan until steaming.',
   'Break in {dark-chocolate}. Whisk until melted.',
   'Add {sugar-caster} and {vanilla-extract}.',
   'Pour into mugs.'],
  serves=4, tier='budget')

R('ginger-lemon-tea', 'Ginger, lemon and honey tea', 'drink',
  ['ginger-fresh 2tbsp', 'lemon 1', 'honey 2tbsp', 'water 1000ml'],
  ['Slice {ginger-fresh}. Put in a pan with {water}.',
   'Simmer 10 minutes.',
   'Add the juice of {lemon} and {honey}.',
   'Strain into mugs.'],
  serves=4, tier='budget')

R('hot-toddy', 'Hot toddy', 'drink',
  ['spirit-40 100ml', 'honey 2tbsp', 'lemon 1', 'cloves 4', 'water 400ml'],
  ['Heat {water} until steaming.',
   'Divide {spirit-40} and {honey} between 4 mugs.',
   'Stick {cloves} into slices of {lemon}. Add one to each mug.',
   'Pour over the hot water. Stir.'],
  serves=4, tier='everyday', note='The spirit is whisky.')

R('negroni', 'Negroni', 'drink',
  ['spirit-40 100ml', 'vermouth 100ml', 'bitter-aperitivo 100ml', 'orange 1'],
  ['Fill a jug with ice.',
   'Add {spirit-40}, {vermouth} and {bitter-aperitivo}. Stir 30 seconds.',
   'Strain over fresh ice in 4 glasses.',
   'Add a strip of peel from {orange}.'],
  serves=4, tier='everyday', note='The spirit is gin; the vermouth sweet red.')

# ---- Menus ----
CHOC = ('Proper hot chocolate', 'win-hot-chocolate')
GING = ('Ginger, lemon and honey tea', 'win-ginger-lemon-tea')
TODDY = ('Hot toddy', 'win-hot-toddy')
NEG = ('Negroni', 'win-negroni')

M('winter-stew', 'Stew and dumplings', 'meat', 6, 'Leek and potato soup, beef stew with dumplings, jam roly-poly and custard.',
  ('win-leek-potato-soup', GING, 'A glass of dry cider'),
  ('win-beef-stew-dumplings', 'Cloudy apple juice', 'A Shiraz or Malbec', ['win-carrot-swede-mash', 'win-caraway-cabbage']),
  ('win-jam-roly-poly', 'Cold milk', TODDY))
M('toad-supper', 'Toad in the hole night', 'meat', 4, 'Chicken and sweetcorn soup, toad in the hole, chocolate puddle pudding.',
  ('win-chicken-sweetcorn-soup', GING, 'A cold lager'),
  ('win-toad-in-the-hole', 'Ginger beer', 'A Côtes du Rhône', ['win-buttery-mash', 'win-braised-leeks']),
  ('win-chocolate-puddle-pudding', CHOC, 'A glass of ruby port'))
M('hotpot-night', 'Hotpot night', 'meat', 6, 'Scotch broth, Lancashire hotpot, treacle tart.',
  ('win-scotch-broth', GING, 'A malt whisky and water, or a dry cider'),
  ('win-lancashire-hotpot', 'Cloudy apple juice', 'A Rioja', ['win-caraway-cabbage']),
  ('win-treacle-tart', 'A pot of tea', TODDY))
M('fish-pie-night', 'Fish pie night', 'fish', 6, 'Orange and fennel salad, classic fish pie, baked rice pudding.',
  ('win-orange-fennel-salad', GING, 'A dry Riesling'),
  ('win-fish-pie', 'Sparkling water with lemon', 'An unoaked Chardonnay', ['win-braised-leeks']),
  ('win-baked-rice-pudding', 'Cold milk', 'A sweet Muscat'))
M('salmon-leek-supper', 'Salmon and leeks', 'fish', 4, 'Smoked haddock chowder, salmon with leeks and mustard, spiced pears.',
  ('win-smoked-haddock-chowder', GING, 'A Chablis'),
  ('win-salmon-leeks-mustard', 'Apple and elderflower pressé', 'A white Burgundy', ['win-buttery-mash']),
  ('win-poached-pears', CHOC, NEG))
M('prawn-winter', 'Prawns two ways', 'shellfish', 4, 'Sizzling garlic prawns, king prawn noodle soup, citrus salad.',
  ('win-garlic-prawns', GING, 'A fino sherry'),
  ('win-prawn-noodle-soup', 'Lime and lemongrass iced tea', 'An off-dry Riesling'),
  ('win-citrus-salad', 'Mint tea', NEG))
M('mac-cheese-night', 'Comfort night', 'vegetarian', 6, 'French onion soup, macaroni cheese, chocolate puddle pudding.',
  ('win-french-onion-soup', GING, 'A glass of dry white Burgundy'),
  ('win-macaroni-cheese', 'Cloudy lemonade', 'A Beaujolais', ['win-caraway-cabbage']),
  ('win-chocolate-puddle-pudding', CHOC, TODDY))
M('leek-bake-supper', 'Leek and cheddar supper', 'vegetarian', 6, 'Welsh rarebit, leek potato and cheddar bake, treacle tart.',
  ('win-welsh-rarebit', GING, 'A cold ale-style lager'),
  ('win-leek-cheddar-bake', 'Cloudy apple juice', 'An oaked Chardonnay', ['win-maple-parsnips']),
  ('win-treacle-tart', 'A pot of tea', 'A small glass of sweet sherry'))
M('stroganoff-night', 'Stroganoff night', 'vegetarian', 4, 'Orange and fennel salad, mushroom stroganoff, baked rice pudding.',
  ('win-orange-fennel-salad', GING, 'A dry rosé'),
  ('win-mushroom-stroganoff', 'Sparkling water with lime', 'A Pinot Noir', ['win-caraway-cabbage']),
  ('win-baked-rice-pudding', CHOC, TODDY))
M('root-stew-vegan', 'Root stew and dumplings', 'vegan', 6, 'Leek and potato soup, root vegetable stew with herb dumplings, sticky date pudding.',
  ('win-leek-potato-soup', GING, 'A dry cider'),
  ('win-root-stew-dumplings', 'Cloudy apple juice', 'A Côtes du Rhône', ['win-maple-parsnips']),
  ('win-sticky-date-pudding', 'Hot oat milk with cinnamon', 'A glass of tawny port'))
M('curry-vegan', 'Winter curry night', 'vegan', 4, 'Orange and fennel salad, chickpea and spinach curry, spiced poached pears.',
  ('win-orange-fennel-salad', GING, 'A dry Riesling'),
  ('win-chickpea-spinach-curry', 'Mango and lime sparkling water', 'A cold lager'),
  ('win-poached-pears', 'Mint tea', NEG))
M('casserole-vegan', 'Sausage casserole', 'vegan', 4, 'Leek and potato soup, plant sausage and bean casserole, winter citrus salad.',
  ('win-leek-potato-soup', GING, 'A dry cider'),
  ('win-sausage-bean-casserole', 'Cloudy apple juice', 'A Tempranillo', ['win-caraway-cabbage']),
  ('win-citrus-salad', 'Mint tea', NEG))
