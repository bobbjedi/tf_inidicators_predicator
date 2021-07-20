import * as tf from '@tensorflow/tfjs';

export async function trainModel(X: any[], Y: any[], window_size: number, n_epochs: number, learning_rate: number, n_layers: number, callback: (a: number, b: any) => void) {

  const batch_size = 63;

  // input dense layer
  const input_layer_shape = [2, window_size];
  const input_layer_neurons = 64;

  // tf.Shape

  // LSTM
  const rnn_input_layer_features = 16;
  const rnn_input_layer_timesteps = input_layer_neurons / rnn_input_layer_features;
  const rnn_input_shape = [rnn_input_layer_features, rnn_input_layer_timesteps]; // the shape have to match input layer's shape
  const rnn_output_neurons = 16; // number of neurons per LSTM's cell
  console.log({rnn_input_shape});
  // output dense layer
  const output_layer_shape = rnn_output_neurons; // dense layer input size is same as LSTM cell
  const output_layer_neurons = 1; // return 1 value

  // ## old method
  // const xs = tf.tensor2d(X, [X.length, X[0].length])//.div(tf.scalar(10));
  // const ys = tf.tensor2d(Y, [Y.length, 1]).reshape([Y.length, 1])//.div(tf.scalar(10));

  // ## new: load data into tensor and normalize data
  console.log('X:', X, 'Y:', Y);
  // X = X.splice(-Y.length);
  // const inputTensor = tf.tensor2d(X, [X.length, X[0].length])
  // const inputTensor = tf.tensor3d(X, [X.length, X[0].length, X[0][0].length])
  const inputTensor = tf.tensor3d(X);
    // .reshape([X.length, X[0].length, X[0][0].length]);
  const labelTensor = tf.tensor2d(Y, [Y.length, 1])
    .reshape([Y.length, 1]);

  console.log('29 ok');
  
  const [xs, inputMax, inputMin] = normalizeTensorFit(inputTensor);
  const [ys, labelMax, labelMin] = normalizeTensorFit(labelTensor);
  console.log('Norm X', [xs, inputMax, inputMin]);
  console.log('Norm Y', [ys, labelMax, labelMin]);
  // ## define model

  const model = tf.sequential();

  model.add(tf.layers.dense({units: input_layer_neurons, inputShape: input_layer_shape}));
  // model.add(tf.layers.reshape({targetShape: rnn_input_shape}));

  let lstm_cells = [];
  for (let index = 0; index < n_layers; index++) {
       lstm_cells.push(tf.layers.lstmCell({units: rnn_output_neurons}));
  }

  model.add(tf.layers.rnn({
    cell: lstm_cells,
    inputShape: rnn_input_shape,
    returnSequences: false
  }));

  model.add(tf.layers.dense({units: output_layer_neurons, inputShape: [output_layer_shape]}));

  model.compile({
    optimizer: tf.train.adam(learning_rate),
    loss: 'meanSquaredError'
  });

  // ## fit model
  console.log('60 ok', xs, ys);
  const hist = await model.fit(xs, ys,
    { batchSize: batch_size, epochs: n_epochs, callbacks: {
      onEpochEnd: callback
    }
  });

  // return { model: model, stats: hist };
  return { model: model, stats: hist, normalize: {inputMax:inputMax, inputMin:inputMin, labelMax:labelMax, labelMin:labelMin} };
}

export function makePredictions(X: any, model: tf.GraphModel, dict_normalize: any)
{
    // const predictedResults = model.predict(tf.tensor2d(X, [X.length, X[0].length]).div(tf.scalar(10))).mul(10); // old method
    
    X = tf.tensor3d(X);
    const normalizedInput = normalizeTensor(X, dict_normalize["inputMax"], dict_normalize["inputMin"]);
    const model_out: any = model.predict(normalizedInput);
    const predictedResults = unNormalizeTensor(model_out, dict_normalize["labelMax"], dict_normalize["labelMin"]);

    return Array.from(predictedResults.dataSync());
}

function normalizeTensorFit(tensor: tf.Tensor) {
  const maxval = tensor.max();
  const minval = tensor.min();
  const normalizedTensor = normalizeTensor(tensor, maxval, minval);
  return [normalizedTensor, maxval, minval];
}

function normalizeTensor(tensor: tf.Tensor, maxval: tf.Tensor<tf.Rank>, minval: tf.Tensor<tf.Rank>) {
  const normalizedTensor = tensor.sub(minval).div(maxval.sub(minval));
  return normalizedTensor;
}

function unNormalizeTensor(tensor: tf.Tensor, maxval: tf.Tensor<tf.Rank>, minval: tf.Tensor<tf.Rank>) {
  const unNormTensor = tensor.mul(maxval.sub(minval)).add(minval);
  return unNormTensor;
}